"""Shared test fixtures for backend tests.

Provides DynamoDB table setup, mock Lambda context, and auth helper
functions used across unit tests and E2E flow tests.
"""

import json
import os
import pytest
from unittest.mock import patch, MagicMock
from moto import mock_aws
import boto3
from jose import jwt


# ============================================================
# Environment & DynamoDB Fixtures
# ============================================================

TEST_ENV = {
    "USERS_TABLE": "TestUsersTable",
    "STATS_TABLE": "TestStatsTable",
    "SECRET_KEY": "test-secret-key",
    "APP_NAME": "TestApp",
    "AWS_DEFAULT_REGION": "us-east-1",
    "AWS_ACCESS_KEY_ID": "testing",
    "AWS_SECRET_ACCESS_KEY": "testing",
}


@pytest.fixture
def dynamodb_tables():
    """Set up mocked DynamoDB tables and reload all handler modules."""
    with patch.dict(os.environ, TEST_ENV):
        with mock_aws():
            dynamodb = boto3.client("dynamodb", region_name="us-east-1")

            dynamodb.create_table(
                TableName="TestUsersTable",
                KeySchema=[{"AttributeName": "email", "KeyType": "HASH"}],
                AttributeDefinitions=[{"AttributeName": "email", "AttributeType": "S"}],
                BillingMode="PAY_PER_REQUEST",
            )
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

            # Reload modules inside mock_aws so boto3 resources use moto
            import config
            from utils import database as db_utils
            from utils import auth as auth_utils
            from utils import email as email_utils
            from handlers import auth as auth_handlers
            from handlers import stats as stats_handlers
            from handlers import training as training_handlers
            from importlib import reload

            reload(config)
            reload(auth_utils)
            reload(email_utils)
            reload(db_utils)
            reload(auth_handlers)
            reload(stats_handlers)
            reload(training_handlers)

            yield {
                "auth": auth_handlers,
                "stats": stats_handlers,
                "training": training_handlers,
                "dynamodb": dynamodb,
            }


@pytest.fixture
def mock_context():
    """Mock AWS Lambda context object."""
    context = MagicMock()
    context.aws_request_id = "test-request-id"
    context.invoked_function_arn = (
        "arn:aws:lambda:us-east-1:123456789012:function:test-function"
    )
    return context


# ============================================================
# Auth Helper Functions
# ============================================================


def signup_user(handlers, ctx, email="test@example.com", password="testpass123"):
    """Sign up a user and return the response."""
    return handlers["auth"].signup(
        {"body": json.dumps({"email": email, "password": password})}, ctx
    )


def login_user(handlers, ctx, email="test@example.com", password="testpass123"):
    """Log in a user and return the response."""
    return handlers["auth"].login(
        {"body": json.dumps({"email": email, "password": password})}, ctx
    )


def signup_and_login(handlers, ctx, email="test@example.com", password="testpass123"):
    """Sign up and log in a user. Returns (token, user_id, email)."""
    signup_user(handlers, ctx, email, password)
    login_resp = login_user(handlers, ctx, email, password)
    body = json.loads(login_resp["body"])
    token = body["access_token"]
    decoded = jwt.decode(token, os.environ["SECRET_KEY"], algorithms=["HS256"])
    return token, decoded["sub"], email


def make_auth_event(token, body=None, query_params=None):
    """Build a Lambda event with Bearer token auth header."""
    event = {"headers": {"Authorization": f"Bearer {token}"}}
    if body is not None:
        event["body"] = json.dumps(body)
    if query_params is not None:
        event["queryStringParameters"] = query_params
    return event


def make_authorizer_event(user_id, body=None):
    """Build a Lambda event with API Gateway JWT authorizer context."""
    event = {
        "requestContext": {
            "authorizer": {"jwt": {"claims": {"sub": user_id}}}
        },
    }
    if body is not None:
        event["body"] = json.dumps(body)
    return event
