import json
import os
import boto3
import logging
import time
from typing import Dict, Any
from botocore.exceptions import ClientError, EndpointConnectionError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Configuration
try:
    ENDPOINT_NAME = os.environ.get('SAGEMAKER_ENDPOINT_NAME', "sentiment-analysis-endpoint-1729402986")
    MAX_RETRIES = int(os.environ.get('MAX_RETRIES', '3'))
    TIMEOUT_SECONDS = int(os.environ.get('TIMEOUT_SECONDS', '30'))
except ValueError as e:
    logger.error(f"Configuration error: {e}")
    raise RuntimeError("Invalid environment variable configuration")

logger.info(f"Configuration - Endpoint: {ENDPOINT_NAME}, Max Retries: {MAX_RETRIES}, Timeout: {TIMEOUT_SECONDS}s")

# Initialize AWS clients with retry configuration
session = boto3.Session()
runtime = session.client(
    'runtime.sagemaker',
    config=boto3.session.Config(
        retries={'max_attempts': MAX_RETRIES, 'mode': 'adaptive'},
        read_timeout=TIMEOUT_SECONDS
    )
)

def validate_input(body: Dict[str, Any]) -> str:
    """Validate and extract text from request body."""
    if not isinstance(body, dict):
        raise ValueError("Request body must be a JSON object")
    
    if 'text' not in body:
        raise ValueError("Missing 'text' field in request body")
    
    text = body['text']
    
    if not isinstance(text, str):
        raise ValueError("'text' field must be a string")
    
    text = text.strip()
    if not text:
        raise ValueError("Text cannot be empty")
    
    if len(text) > 5000:  # Reasonable limit
        raise ValueError("Text is too long (max 5000 characters)")
    
    return text

def invoke_sagemaker_endpoint(text: str) -> Dict[str, Any]:
    """Invoke SageMaker endpoint with retry logic."""
    for attempt in range(MAX_RETRIES):
        try:
            logger.info(f"Attempting SageMaker inference (attempt {attempt + 1}/{MAX_RETRIES})")
            
            response = runtime.invoke_endpoint(
                EndpointName=ENDPOINT_NAME,
                ContentType='application/json',
                Body=json.dumps({"inputs": text})
            )
            
            result = json.loads(response['Body'].read().decode())
            logger.info(f"SageMaker response: {result}")
            
            # Validate response structure
            if not isinstance(result, list) or len(result) == 0:
                raise ValueError("Invalid response format from SageMaker endpoint")
            
            first_result = result[0]
            if 'label' not in first_result or 'score' not in first_result:
                raise ValueError("Missing required fields in SageMaker response")
            
            return {
                'sentiment': first_result['label'],
                'confidence': float(first_result['score'])
            }
            
        except (ClientError, EndpointConnectionError) as e:
            logger.warning(f"SageMaker endpoint error (attempt {attempt + 1}): {e}")
            if attempt == MAX_RETRIES - 1:
                raise
            time.sleep(2 ** attempt)  # Exponential backoff
        except Exception as e:
            logger.error(f"Unexpected error during SageMaker inference: {e}")
            raise

def create_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create standardized HTTP response."""
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'OPTIONS,POST',
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body)
    }

def lambda_handler(event: Dict[str, Any], context) -> Dict[str, Any]:
    """Main Lambda handler with comprehensive error handling."""
    start_time = time.time()
    request_id = context.aws_request_id if context else 'unknown'
    
    logger.info(f"[{request_id}] Processing request - Event: {json.dumps(event, default=str)}")
    
    # Handle OPTIONS request for CORS
    if event.get('httpMethod') == 'OPTIONS':
        return create_response(200, {'message': 'CORS preflight'})
    
    try:
        # Parse request body
        if 'body' in event:
            if isinstance(event['body'], str):
                body = json.loads(event['body'])
            else:
                body = event['body']
        else:
            body = event  # For non-proxy integration
        
        logger.info(f"[{request_id}] Parsed body: {json.dumps(body, default=str)}")
        
        # Validate input
        text = validate_input(body)
        logger.info(f"[{request_id}] Processing text (length: {len(text)}): {text[:100]}...")
        
        # Invoke SageMaker endpoint
        result = invoke_sagemaker_endpoint(text)
        
        # Add metadata
        result.update({
            'timestamp': int(time.time()),
            'processing_time_ms': int((time.time() - start_time) * 1000),
            'request_id': request_id
        })
        
        logger.info(f"[{request_id}] Successfully processed request in {result['processing_time_ms']}ms")
        return create_response(200, result)
        
    except json.JSONDecodeError as e:
        logger.error(f"[{request_id}] JSON parsing error: {e}")
        return create_response(400, {
            'error': 'Invalid JSON in request body',
            'errorType': 'ValidationError',
            'request_id': request_id
        })
        
    except ValueError as e:
        logger.error(f"[{request_id}] Validation error: {e}")
        return create_response(400, {
            'error': str(e),
            'errorType': 'ValidationError',
            'request_id': request_id
        })
        
    except ClientError as e:
        logger.error(f"[{request_id}] AWS service error: {e}")
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        
        if error_code in ['ValidationException', 'ModelError']:
            status_code = 400
        elif error_code in ['ThrottlingException', 'ServiceUnavailable']:
            status_code = 503
        else:
            status_code = 500
            
        return create_response(status_code, {
            'error': 'Service temporarily unavailable. Please try again.',
            'errorType': 'ServiceError',
            'errorCode': error_code,
            'request_id': request_id
        })
        
    except Exception as e:
        logger.error(f"[{request_id}] Unexpected error: {e}", exc_info=True)
        return create_response(500, {
            'error': 'Internal server error. Please try again later.',
            'errorType': 'InternalError',
            'request_id': request_id
        })
