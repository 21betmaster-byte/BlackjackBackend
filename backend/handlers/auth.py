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

        access_token = create_access_token(data={"sub": user["id"], "email": email})

        mandatory_details_completed = bool(user.get("mandatory_details_completed", False))

        return {
            "statusCode": 200,
            "body": json.dumps({
                "access_token": access_token,
                "token_type": "bearer",
                "mandatory_details_completed": mandatory_details_completed,
            }),
        }

    except Exception as e:
        print(f"Login error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"detail": "An unexpected error occurred."}),
        }

def google_auth(event, context):
    try:
        body = json.loads(event["body"])
        email = body.get("email")
        google_id = body.get("google_id")
        name = body.get("name", "")

        if not email or not google_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"detail": "Email and google_id are required."}),
            }

        response = users_table.get_item(Key={"email": email})

        mandatory_details_completed = False
        if "Item" in response:
            # Existing user — generate token and return
            user = response["Item"]
            access_token = create_access_token(data={"sub": user["id"], "email": email})
            mandatory_details_completed = bool(user.get("mandatory_details_completed", False))
        else:
            # New user — create account without password
            user_id = str(uuid.uuid4())
            users_table.put_item(
                Item={
                    "id": user_id,
                    "email": email,
                    "name": name,
                    "google_id": google_id,
                    "auth_provider": "google",
                    "created_at": str(datetime.now()),
                }
            )
            access_token = create_access_token(data={"sub": user_id, "email": email})

        return {
            "statusCode": 200,
            "body": json.dumps({
                "access_token": access_token,
                "token_type": "bearer",
                "mandatory_details_completed": mandatory_details_completed,
            }),
        }

    except Exception as e:
        print(f"Google auth error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"detail": "An unexpected error occurred."}),
        }


def _get_email_from_token(event):
    """Extract email from the Authorization Bearer token."""
    from utils.auth import decode_access_token
    auth_header = event.get("headers", {}).get("authorization", "") or event.get("headers", {}).get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    payload = decode_access_token(token)
    if not payload:
        return None
    return payload.get("email")


def save_mandatory_details(event, context):
    try:
        email = _get_email_from_token(event)
        if not email:
            return {
                "statusCode": 401,
                "body": json.dumps({"detail": "Unauthorized"}),
            }

        body = json.loads(event["body"])
        first_name = body.get("first_name", "").strip()
        last_name = body.get("last_name", "").strip()
        dob = body.get("dob", "").strip()
        country = body.get("country", "").strip()

        if not first_name or not last_name or not dob or not country:
            return {
                "statusCode": 400,
                "body": json.dumps({"detail": "All fields (first_name, last_name, dob, country) are required."}),
            }

        users_table.update_item(
            Key={"email": email},
            UpdateExpression="SET first_name = :fn, last_name = :ln, dob = :dob, country = :c, mandatory_details_completed = :mdc, updated_at = :ua",
            ExpressionAttributeValues={
                ":fn": first_name,
                ":ln": last_name,
                ":dob": dob,
                ":c": country,
                ":mdc": True,
                ":ua": str(datetime.now()),
            },
        )

        return {
            "statusCode": 200,
            "body": json.dumps({"status": "saved"}),
        }

    except Exception as e:
        print(f"Save mandatory details error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"detail": "An unexpected error occurred."}),
        }


def get_mandatory_details(event, context):
    try:
        email = _get_email_from_token(event)
        if not email:
            return {
                "statusCode": 401,
                "body": json.dumps({"detail": "Unauthorized"}),
            }

        response = users_table.get_item(Key={"email": email})
        if "Item" not in response:
            return {
                "statusCode": 404,
                "body": json.dumps({"detail": "User not found."}),
            }

        user = response["Item"]
        return {
            "statusCode": 200,
            "body": json.dumps({
                "first_name": user.get("first_name", ""),
                "last_name": user.get("last_name", ""),
                "dob": user.get("dob", ""),
                "country": user.get("country", ""),
                "mandatory_details_completed": bool(user.get("mandatory_details_completed", False)),
            }),
        }

    except Exception as e:
        print(f"Get mandatory details error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"detail": "An unexpected error occurred."}),
        }
