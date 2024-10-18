import json
import os
import pytest
from unittest.mock import patch, MagicMock

# Mock environment variables
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'
os.environ['SAGEMAKER_ENDPOINT_NAME'] = 'mock-endpoint'

# Import the lambda function after setting mock environment variables
from lambda_function import lambda_handler

@pytest.fixture
def mock_sagemaker_response():
    return {
        'Body': MagicMock(read=lambda: json.dumps([
            {'label': 'POSITIVE', 'score': 0.9}
        ]).encode())
    }

@patch('boto3.client')
def test_lambda_handler(mock_boto3_client, mock_sagemaker_response):
    # Set up the mock
    mock_client = MagicMock()
    mock_client.invoke_endpoint.return_value = mock_sagemaker_response
    mock_boto3_client.return_value = mock_client

    # Mock event
    event = {
        'body': json.dumps({'text': 'This is a test.'})
    }
    
    # Mock context
    context = MagicMock()
    
    # Call the lambda_handler function
    response = lambda_handler(event, context)
    
    # Assert the response structure
    assert response['statusCode'] == 200
    assert 'body' in response
    
    # Parse the body
    body = json.loads(response['body'])
    
    # Assert the body structure
    assert 'sentiment' in body
    assert 'confidence' in body
    assert body['sentiment'] == 'POSITIVE'
    assert body['confidence'] == 0.9

def test_lambda_handler_error():
    # Test with missing 'text' field
    event = {
        'body': json.dumps({})
    }
    
    context = MagicMock()
    
    response = lambda_handler(event, context)
    
    assert response['statusCode'] == 500
    assert 'error' in json.loads(response['body'])