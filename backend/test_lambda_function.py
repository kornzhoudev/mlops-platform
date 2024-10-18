import json
from lambda_function import lambda_handler

def test_lambda_handler():
    # Mock event
    event = {
        'body': json.dumps({'text': 'This is a test.'})
    }
    
    # Mock context
    class MockContext:
        pass
    context = MockContext()
    
    # Call the lambda_handler function
    response = lambda_handler(event, context)
    
    # Assert the response structure
    assert 'statusCode' in response
    assert 'body' in response
    
    # Parse the body
    body = json.loads(response['body'])
    
    # Assert the body structure
    assert 'sentiment' in body
    assert 'confidence' in body