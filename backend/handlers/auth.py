import json
import os
import uuid
from datetime import datetime
import boto3
from utils.auth import get_password_hash, verify_password, create_access_token, ALGORITHM

# --- Environment Variables ---
USERS_TABLE = os.getenv("USERS_TABLE", "UsersTable")

# --- AWS Clients ---
dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table(USERS_TABLE)

# --- Lambda Handlers ---
def signup(event, context):
    try:
        body = json.loads(event["body"])
        email = body.get("email")
        password = body.get("password")

        if not email or not password:
            return {
                "statusCode": 400,
                "body": json.dumps({"detail": "Email and password are required."}),
            }

        # Check if user already exists
        response = users_table.get_item(Key={"email": email})
        if "Item" in response:
            return {
                "statusCode": 400,
                "body": json.dumps({"detail": "Email already exists."}),
            }

        hashed_password = get_password_hash(password)
        user_id = str(uuid.uuid4())
        
        users_table.put_item(
            Item={
                "id": user_id,
                "email": email,
                "password": hashed_password,
                "created_at": str(datetime.now()),
            }
        )

        return {
            "statusCode": 201,
            "body": json.dumps({"status": "success", "user_id": user_id}),
        }

    except Exception as e:
        print(f"Signup error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"detail": "An unexpected error occurred."}),
        }

def login(event, context):
    try:
        body = json.loads(event["body"])
        email = body.get("email")
        password = body.get("password")

        if not email or not password:
            return {
                "statusCode": 400,
                "body": json.dumps({"detail": "Email and password are required."}),
            }

        response = users_table.get_item(Key={"email": email})
        if "Item" not in response:
            return {
                "statusCode": 401,
                "body": json.dumps({"detail": "Incorrect username or password"}),
            }

        user = response["Item"]
        if not verify_password(password, user["password"]):
            return {
                "statusCode": 401,
                "body": json.dumps({"detail": "Incorrect username or password"}),
            }

        access_token = create_access_token(data={"sub": user["id"]})

        return {
            "statusCode": 200,
            "body": json.dumps({"access_token": access_token, "token_type": "bearer"}),
        }

    except Exception as e:
        print(f"Login error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"detail": "An unexpected error occurred."}),
        }
