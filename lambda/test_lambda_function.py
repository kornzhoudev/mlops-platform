import json
import os
import pytest
from unittest.mock import patch, MagicMock

# Mock environment variables
os.environ['AWS_DEFAULT_REGION'] = 'ap-southeast-2'
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
@patch('boto3.Session')
def test_lambda_handler(mock_session, mock_boto3_client, mock_sagemaker_response):
    # Set up the mock session
    mock_session_instance = MagicMock()
    mock_session.return_value = mock_session_instance
    mock_session_instance.client.return_value = mock_boto3_client

    # Set up the mock client
    mock_boto3_client.invoke_endpoint.return_value = mock_sagemaker_response

    # Mock event
    event = {
        'body': json.dumps({'text': 'This is a test.'})
    }
    
    # Mock context
    context = MagicMock()
    
    # Call the lambda_handler function
    response = lambda_handler(event, context)
    
    # Assert the response structure
    assert response['statusCode'] == 200, f"Unexpected status code: {response['statusCode']}, body: {response['body']}"
    assert 'body' in response
    
    # Parse the body
    body = json.loads(response['body'])
    
    # Assert the body structure
    assert 'sentiment' in body
    assert 'confidence' in body
    assert body['sentiment'] == 'POSITIVE'
    assert body['confidence'] == 0.9

@patch('boto3.client')
@patch('boto3.Session')
def test_lambda_handler_error(mock_session, mock_boto3_client):
    # Set up the mock session
    mock_session_instance = MagicMock()
    mock_session.return_value = mock_session_instance
    mock_session_instance.client.return_value = mock_boto3_client

    # Test with missing 'text' field
    event = {
        'body': json.dumps({})
    }
    
    context = MagicMock()
    
    response = lambda_handler(event, context)
    
    assert response['statusCode'] == 500
    assert 'error' in json.loads(response['body'])