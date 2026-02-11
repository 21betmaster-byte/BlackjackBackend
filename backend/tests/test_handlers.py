import pytest
import json
import os
from unittest.mock import patch, MagicMock
from moto import mock_aws
import boto3
from datetime import datetime, timedelta
from jose import jwt # Explicitly import jwt from jose

@pytest.fixture
def dynamodb_tables():
    with patch.dict(os.environ, {
        "USERS_TABLE": "TestUsersTable",
        "STATS_TABLE": "TestStatsTable",
        "SECRET_KEY": "test-secret-key",
        "AWS_DEFAULT_REGION": "us-east-1",
        "AWS_ACCESS_KEY_ID": "testing",
        "AWS_SECRET_ACCESS_KEY": "testing",
    }):
        with mock_aws():
            dynamodb = boto3.client("dynamodb", region_name="us-east-1")

            # Create UsersTable
            dynamodb.create_table(
                TableName="TestUsersTable",
                KeySchema=[{"AttributeName": "email", "KeyType": "HASH"}],
                AttributeDefinitions=[{"AttributeName": "email", "AttributeType": "S"}],
                BillingMode="PAY_PER_REQUEST",
            )
            # Create StatsTable
            dynamodb.create_table(
                TableName="TestStatsTable",
                KeySchema=[
                    {"AttributeName": "userId", "KeyType": "HASH"},
                    {"AttributeName": "timestamp", "KeyType": "RANGE"},
                ],
                AttributeDefinitions=[
                    {"AttributeName": "userId", "AttributeType": "S"},
                    {"AttributeName": "timestamp", "AttributeType": "S"},
                ],
                BillingMode="PAY_PER_REQUEST",
            )

            # Reload handlers inside mock_aws so boto3 resources use moto
            global auth_handlers, stats_handlers
            from handlers import auth as auth_handlers
            from handlers import stats as stats_handlers
            from importlib import reload
            reload(auth_handlers)
            reload(stats_handlers)

            yield dynamodb

@pytest.fixture
def mock_context():
    # A mock Lambda context object
    context = MagicMock()
    context.aws_request_id = "test-request-id"
    context.invoked_function_arn = "arn:aws:lambda:us-east-1:123456789012:function:test-function"
    return context

# --- Tests for auth.py ---

def test_signup_success(dynamodb_tables, mock_context):
    event = {
        "body": json.dumps({"email": "test@example.com", "password": "password123"})
    }
    response = auth_handlers.signup(event, mock_context)
    assert response["statusCode"] == 201
    body = json.loads(response["body"])
    assert body["status"] == "success"
    assert "user_id" in body

    # Verify item in DynamoDB
    table = boto3.resource("dynamodb").Table("TestUsersTable")
    item = table.get_item(Key={"email": "test@example.com"})["Item"]
    assert item["email"] == "test@example.com"
    assert "password" in item
    assert auth_handlers.verify_password("password123", item["password"])

def test_signup_missing_fields(dynamodb_tables, mock_context):
    event = {"body": json.dumps({"email": "test@example.com"})}
    response = auth_handlers.signup(event, mock_context)
    assert response["statusCode"] == 400
    body = json.loads(response["body"])
    assert body["detail"] == "Email and password are required."

def test_signup_duplicate_email(dynamodb_tables, mock_context):
    # First signup
    event = {
        "body": json.dumps({"email": "duplicate@example.com", "password": "password123"})
    }
    auth_handlers.signup(event, mock_context)

    # Second signup with same email
    response = auth_handlers.signup(event, mock_context)
    assert response["statusCode"] == 400
    body = json.loads(response["body"])
    assert body["detail"] == "Email already exists."

def test_login_success(dynamodb_tables, mock_context):
    # Setup: signup a user first
    signup_event = {
        "body": json.dumps({"email": "login@example.com", "password": "loginpassword"})
    }
    auth_handlers.signup(signup_event, mock_context)

    # Now attempt login
    login_event = {
        "body": json.dumps({"email": "login@example.com", "password": "loginpassword"})
    }
    response = auth_handlers.login(login_event, mock_context)
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert "access_token" in body
    assert body["token_type"] == "bearer"

def test_login_invalid_credentials(dynamodb_tables, mock_context):
    event = {
        "body": json.dumps({"email": "nonexistent@example.com", "password": "fakepassword"})
    }
    response = auth_handlers.login(event, mock_context)
    assert response["statusCode"] == 401
    body = json.loads(response["body"])
    assert body["detail"] == "Incorrect username or password"

def test_login_wrong_password(dynamodb_tables, mock_context):
    # Setup: signup a user first
    signup_event = {
        "body": json.dumps({"email": "wrongpass@example.com", "password": "correctpassword"})
    }
    auth_handlers.signup(signup_event, mock_context)

    # Now attempt login with wrong password
    login_event = {
        "body": json.dumps({"email": "wrongpass@example.com", "password": "wrongpassword"})
    }
    response = auth_handlers.login(login_event, mock_context)
    assert response["statusCode"] == 401
    body = json.loads(response["body"])
    assert body["detail"] == "Incorrect username or password"

# --- Tests for stats.py ---

def test_save_stats_success(dynamodb_tables, mock_context):
    # Setup: create a dummy user and a valid token
    user_email = "statsuser@example.com"
    user_password = "statspassword"
    signup_event = {
        "body": json.dumps({"email": user_email, "password": user_password})
    }
    auth_handlers.signup(signup_event, mock_context)

    login_event = {
        "body": json.dumps({"email": user_email, "password": user_password})
    }
    login_response = auth_handlers.login(login_event, mock_context)
    user_token = json.loads(login_response["body"])["access_token"]
    
    # Decode token to get user ID for authorizer context simulation
    # Using auth_handlers.ALGORITHM because ALGORITHM is imported into auth_handlers from utils/auth
    decoded_token = jwt.decode(user_token, os.environ["SECRET_KEY"], algorithms=[auth_handlers.ALGORITHM])
    user_id_from_token = decoded_token["sub"]

    event = {
        "requestContext": {
            "authorizer": {
                "jwt": {
                    "claims": {
                        "sub": user_id_from_token # Simulate user ID from authorizer
                    }
                }
            }
        },
        "body": json.dumps({"result": "win", "mistakes": 1})
    }
    response = stats_handlers.save(event, mock_context)
    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["status"] == "saved"

    # Verify item in DynamoDB
    table = boto3.resource("dynamodb").Table("TestStatsTable")
    # DynamoDB doesn't have a simple get_item by HASH and RANGE without exact range key
    # We'll do a query, but a full scan for test might be simpler for single item
    query_response = table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key('userId').eq(user_id_from_token)
    )
    items = query_response["Items"]
    assert len(items) > 0
    assert items[0]["result"] == "win"
    assert items[0]["mistakes"] == 1
    assert "timestamp" in items[0]

def test_save_stats_unauthorized_no_authorizer_context(dynamodb_tables, mock_context):
    event = {
        "body": json.dumps({"result": "loss", "mistakes": 0})
        # Missing requestContext.authorizer.jwt.claims
    }
    response = stats_handlers.save(event, mock_context)
    assert response["statusCode"] == 401
    body = json.loads(response["body"])
    assert body["detail"] == "Unauthorized"

def test_save_stats_invalid_body(dynamodb_tables, mock_context):
    # Setup: create a dummy user and token
    user_email = "invalidstats@example.com"
    user_password = "password"
    auth_handlers.signup({"body": json.dumps({"email": user_email, "password": user_password})}, mock_context)
    login_response = auth_handlers.login({"body": json.dumps({"email": user_email, "password": user_password})}, mock_context)
    user_token = json.loads(login_response["body"])["access_token"]
    # Using auth_handlers.ALGORITHM because ALGORITHM is imported into auth_handlers from utils/auth
    decoded_token = jwt.decode(user_token, os.environ["SECRET_KEY"], algorithms=[auth_handlers.ALGORITHM])
    user_id_from_token = decoded_token["sub"]

    event = {
        "requestContext": {
            "authorizer": {
                "jwt": {
                    "claims": {
                        "sub": user_id_from_token
                    }
                }
            }
        },
        "body": json.dumps({"result": "invalid", "mistakes": "not_an_int"}) # Invalid data
    }
    response = stats_handlers.save(event, mock_context)
    assert response["statusCode"] == 400
    body = json.loads(response["body"])
    assert body["detail"] == "Invalid stats data."


# --- Tests for mandatory details ---

def _signup_and_login(mock_context, email="mandtest@example.com", password="testpass123"):
    """Helper: signup a user, login, return (access_token, email)."""
    auth_handlers.signup(
        {"body": json.dumps({"email": email, "password": password})}, mock_context
    )
    login_resp = auth_handlers.login(
        {"body": json.dumps({"email": email, "password": password})}, mock_context
    )
    token = json.loads(login_resp["body"])["access_token"]
    return token


def test_login_returns_mandatory_details_completed_false_initially(dynamodb_tables, mock_context):
    auth_handlers.signup(
        {"body": json.dumps({"email": "mdc@example.com", "password": "pass123"})}, mock_context
    )
    resp = auth_handlers.login(
        {"body": json.dumps({"email": "mdc@example.com", "password": "pass123"})}, mock_context
    )
    body = json.loads(resp["body"])
    assert body["mandatory_details_completed"] is False


def test_save_mandatory_details_success(dynamodb_tables, mock_context):
    token = _signup_and_login(mock_context)
    event = {
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({
            "first_name": "John",
            "last_name": "Doe",
            "dob": "06 / 15 / 1990",
            "country": "United States",
        }),
    }
    resp = auth_handlers.save_mandatory_details(event, mock_context)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["status"] == "saved"


def test_save_mandatory_details_missing_fields(dynamodb_tables, mock_context):
    token = _signup_and_login(mock_context, email="missing@example.com")
    event = {
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({
            "first_name": "John",
            "last_name": "",
            "dob": "",
            "country": "",
        }),
    }
    resp = auth_handlers.save_mandatory_details(event, mock_context)
    assert resp["statusCode"] == 400
    body = json.loads(resp["body"])
    assert "required" in body["detail"].lower()


def test_save_mandatory_details_unauthorized(dynamodb_tables, mock_context):
    event = {
        "headers": {},
        "body": json.dumps({
            "first_name": "John",
            "last_name": "Doe",
            "dob": "06 / 15 / 1990",
            "country": "United States",
        }),
    }
    resp = auth_handlers.save_mandatory_details(event, mock_context)
    assert resp["statusCode"] == 401


def test_get_mandatory_details_after_save(dynamodb_tables, mock_context):
    token = _signup_and_login(mock_context, email="getdetails@example.com")

    # Save details first
    save_event = {
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({
            "first_name": "Jane",
            "last_name": "Smith",
            "dob": "12 / 25 / 1985",
            "country": "Canada",
        }),
    }
    auth_handlers.save_mandatory_details(save_event, mock_context)

    # Now get them
    get_event = {
        "headers": {"Authorization": f"Bearer {token}"},
    }
    resp = auth_handlers.get_mandatory_details(get_event, mock_context)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["first_name"] == "Jane"
    assert body["last_name"] == "Smith"
    assert body["dob"] == "12 / 25 / 1985"
    assert body["country"] == "Canada"
    assert body["mandatory_details_completed"] is True


def test_login_returns_mandatory_details_completed_true_after_save(dynamodb_tables, mock_context):
    email = "afterflag@example.com"
    password = "pass123"
    token = _signup_and_login(mock_context, email=email, password=password)

    # Save mandatory details
    save_event = {
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({
            "first_name": "Test",
            "last_name": "User",
            "dob": "01 / 01 / 2000",
            "country": "India",
        }),
    }
    auth_handlers.save_mandatory_details(save_event, mock_context)

    # Login again — should now show completed=True
    login_resp = auth_handlers.login(
        {"body": json.dumps({"email": email, "password": password})}, mock_context
    )
    body = json.loads(login_resp["body"])
    assert body["mandatory_details_completed"] is True