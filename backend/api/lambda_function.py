import json
import boto3
import transformers

# Initialize SageMaker runtime client
runtime = boto3.client('runtime.sagemaker')
# Load pre-trained tokenizer
tokenizer = transformers.AutoTokenizer.from_pretrained("bert-base-uncased")

def lambda_handler(event, context):
    # Parse the input from API Gateway
    body = json.loads(event['body'])
    text = body['text']
    
    # Tokenize the input text
    inputs = tokenizer(text, return_tensors="pt", max_length=512, truncation=True, padding="max_length")
    
    # Prepare input for SageMaker endpoint
    input_json = {
        "inputs": inputs["input_ids"].tolist(),
        "attention_mask": inputs["attention_mask"].tolist()
    }
    
    # Call SageMaker endpoint for inference
    response = runtime.invoke_endpoint(
        EndpointName='sentiment-analysis-endpoint',
        ContentType='application/json',
        Body=json.dumps(input_json)
    )
    
    # Parse the response from SageMaker
    result = json.loads(response['Body'].read().decode())
    sentiment = 'Positive' if result[0] > 0.5 else 'Negative'
    
    # Return the result
    return {
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': True,
        },
        'body': json.dumps({'sentiment': sentiment, 'score': result[0]})
    }