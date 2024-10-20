from locust import HttpUser, task, between
import json

class LambdaLoadTestUser(HttpUser):
    # Set the host URL of your API Gateway or Lambda endpoint
    host = "https://h5q4xxbiv4.execute-api.ap-southeast-2.amazonaws.com/prod"  # Update this URL with your actual endpoint

    wait_time = between(1, 2)

    @task
    def invoke_lambda(self):
        headers = {"Content-Type": "application/json"}
        payload = {"text": "This is a performance test"}
        self.client.post("/", data=json.dumps(payload), headers=headers)
