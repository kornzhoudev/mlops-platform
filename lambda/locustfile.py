from locust import HttpUser, task, between
import json

class LambdaLoadTestUser(HttpUser):
    wait_time = between(1, 2)

    @task
    def invoke_lambda(self):
        headers = {"Content-Type": "application/json"}
        payload = {"text": "This is a performance test"}
        self.client.post("/", data=json.dumps(payload), headers=headers)
