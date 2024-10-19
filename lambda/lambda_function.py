import json
import os
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

try:
    ENDPOINT_NAME = os.environ['SAGEMAKER_ENDPOINT_NAME']
except KeyError:
    raise RuntimeError("SAGEMAKER_ENDPOINT_NAME environment variable is not set.")

print(ENDPOINT_NAME)

session = boto3.Session()
runtime = session.client('runtime.sagemaker')
logger.info(f"SageMaker Endpoint: {ENDPOINT_NAME}")

def lambda_handler(event, context):
    logger.info(f"Received event: {json.dumps(event)}")
    
    try:
        # Check if this is a proxy integration
        if 'body' in event:
            if isinstance(event['body'], str):
                body = json.loads(event['body'])
            else:
                body = event['body']
        else:
            body = event  # For non-proxy integration
        logger.info(f"Parsed body: {json.dumps(body)}")
        
        if 'text' not in body:
            raise ValueError("Missing 'text' field in request body")
        
        text = body['text']
        
        # Call SageMaker endpoint
        response = runtime.invoke_endpoint(
            EndpointName=ENDPOINT_NAME,
            ContentType='application/json',
            Body=json.dumps({"inputs": text})
        )
        
        result = json.loads(response['Body'].read().decode())
        logger.info(f"SageMaker response: {result}")
        
        sentiment = result[0]['label']
        confidence = result[0]['score']
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            'body': json.dumps({
                'sentiment': sentiment,
                'confidence': float(confidence)
            })
        }
    except Exception as e:
        logger.error(f"Error in Lambda function: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            'body': json.dumps({
                'error': str(e),
                'errorType': type(e).__name__
            })
        }
