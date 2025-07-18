import json
import os
import pytest
from unittest.mock import patch, MagicMock
from botocore.exceptions import ClientError

# Mock environment variables
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'
os.environ['SAGEMAKER_ENDPOINT_NAME'] = 'mock-endpoint'
os.environ['MAX_RETRIES'] = '2'
os.environ['TIMEOUT_SECONDS'] = '10'

# Mock entire boto3 module
mock_boto3 = MagicMock()
mock_session = MagicMock()
mock_client = MagicMock()

mock_boto3.Session.return_value = mock_session
mock_session.client.return_value = mock_client

# Mock Config class
mock_config = MagicMock()
mock_boto3.session.Config.return_value = mock_config

# Apply the mock before importing the lambda function
with patch.dict('sys.modules', {'boto3': mock_boto3}):
    from lambda_function import lambda_handler, validate_input, invoke_sagemaker_endpoint

@pytest.fixture
def mock_sagemaker_response():
    return {
        'Body': MagicMock(read=lambda: json.dumps([
            {'label': 'POSITIVE', 'score': 0.9}
        ]).encode())
    }

@pytest.fixture
def mock_context():
    context = MagicMock()
    context.aws_request_id = 'test-request-id-123'
    return context

class TestValidateInput:
    def test_valid_input(self):
        body = {'text': 'This is a test message'}
        result = validate_input(body)
        assert result == 'This is a test message'
    
    def test_missing_text_field(self):
        body = {}
        with pytest.raises(ValueError, match="Missing 'text' field"):
            validate_input(body)
    
    def test_empty_text(self):
        body = {'text': '   '}
        with pytest.raises(ValueError, match="Text cannot be empty"):
            validate_input(body)
    
    def test_text_too_long(self):
        body = {'text': 'x' * 5001}
        with pytest.raises(ValueError, match="Text is too long"):
            validate_input(body)
    
    def test_non_string_text(self):
        body = {'text': 123}
        with pytest.raises(ValueError, match="'text' field must be a string"):
            validate_input(body)

class TestLambdaHandler:
    def test_successful_request(self, mock_sagemaker_response, mock_context):
        # Set up the mock client response
        mock_client.invoke_endpoint.return_value = mock_sagemaker_response

        # Mock event
        event = {
            'body': json.dumps({'text': 'This is a positive message!'})
        }
        
        # Call the lambda_handler function
        response = lambda_handler(event, mock_context)
        
        # Assert the response structure
        assert response['statusCode'] == 200
        assert 'body' in response
        
        # Parse the body
        body = json.loads(response['body'])
        
        # Assert the body structure
        assert 'sentiment' in body
        assert 'confidence' in body
        assert 'timestamp' in body
        assert 'processing_time_ms' in body
        assert 'request_id' in body
        assert body['sentiment'] == 'POSITIVE'
        assert body['confidence'] == 0.9
        assert body['request_id'] == 'test-request-id-123'

    def test_missing_text_field(self, mock_context):
        event = {
            'body': json.dumps({})
        }
        
        response = lambda_handler(event, mock_context)
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert 'error' in body
        assert body['errorType'] == 'ValidationError'
        assert 'Missing \'text\' field' in body['error']

    def test_invalid_json(self, mock_context):
        event = {
            'body': 'invalid json'
        }
        
        response = lambda_handler(event, mock_context)
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert body['errorType'] == 'ValidationError'
        assert 'Invalid JSON' in body['error']

    def test_options_request(self, mock_context):
        event = {
            'httpMethod': 'OPTIONS'
        }
        
        response = lambda_handler(event, mock_context)
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['message'] == 'CORS preflight'

    def test_sagemaker_client_error(self, mock_context):
        # Mock SageMaker client error
        error_response = {'Error': {'Code': 'ValidationException', 'Message': 'Invalid input'}}
        mock_client.invoke_endpoint.side_effect = ClientError(error_response, 'InvokeEndpoint')
        
        event = {
            'body': json.dumps({'text': 'Test message'})
        }
        
        response = lambda_handler(event, mock_context)
        
        assert response['statusCode'] == 400
        body = json.loads(response['body'])
        assert body['errorType'] == 'ServiceError'
        assert body['errorCode'] == 'ValidationException'

    def test_sagemaker_throttling_error(self, mock_context):
        # Mock SageMaker throttling error
        error_response = {'Error': {'Code': 'ThrottlingException', 'Message': 'Rate exceeded'}}
        mock_client.invoke_endpoint.side_effect = ClientError(error_response, 'InvokeEndpoint')
        
        event = {
            'body': json.dumps({'text': 'Test message'})
        }
        
        response = lambda_handler(event, mock_context)
        
        assert response['statusCode'] == 503
        body = json.loads(response['body'])
        assert body['errorType'] == 'ServiceError'
        assert body['errorCode'] == 'ThrottlingException'

    def test_unexpected_error(self, mock_context):
        # Mock unexpected error
        mock_client.invoke_endpoint.side_effect = Exception('Unexpected error')
        
        event = {
            'body': json.dumps({'text': 'Test message'})
        }
        
        response = lambda_handler(event, mock_context)
        
        assert response['statusCode'] == 500
        body = json.loads(response['body'])
        assert body['errorType'] == 'InternalError'
        assert 'Internal server error' in body['error']

    def test_non_proxy_integration(self, mock_sagemaker_response, mock_context):
        # Test direct event (non-API Gateway proxy integration)
        mock_client.invoke_endpoint.return_value = mock_sagemaker_response
        
        event = {'text': 'Direct event test'}
        
        response = lambda_handler(event, mock_context)
        
        assert response['statusCode'] == 200
        body = json.loads(response['body'])
        assert body['sentiment'] == 'POSITIVE'