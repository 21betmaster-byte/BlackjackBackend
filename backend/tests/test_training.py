import pytest
import json
import os
from unittest.mock import patch, MagicMock
from moto import mock_aws
import boto3
from datetime import datetime
from jose import jwt


@pytest.fixture
def dynamodb_tables():
    with patch.dict(os.environ, {
        "USERS_TABLE": "TestUsersTable",
        "STATS_TABLE": "TestStatsTable",
        "SECRET_KEY": "test-secret-key",
        "APP_NAME": "TestApp",
        "AWS_DEFAULT_REGION": "us-east-1",
        "AWS_ACCESS_KEY_ID": "testing",
        "AWS_SECRET_ACCESS_KEY": "testing",
    }):
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

            # Reload modules inside mock_aws
            import config
            from utils import database as db_utils
            from utils import auth as auth_utils
            from handlers import auth as auth_handlers
            from handlers import stats as stats_handlers
            from handlers import training as training_handlers
            from importlib import reload
            reload(config)
            reload(auth_utils)
            reload(db_utils)
            reload(auth_handlers)
            reload(stats_handlers)
            reload(training_handlers)

            # Make handlers available globally in this fixture
            yield {
                "auth": auth_handlers,
                "stats": stats_handlers,
                "training": training_handlers,
            }


@pytest.fixture
def mock_context():
    context = MagicMock()
    context.aws_request_id = "test-request-id"
    return context


def _signup_and_get_token(handlers, mock_context, email="train@example.com"):
    """Helper: signup a user and return (token, email)."""
    handlers["auth"].signup(
        {"body": json.dumps({"email": email, "password": "testpass123"})},
        mock_context,
    )
    login_resp = handlers["auth"].login(
        {"body": json.dumps({"email": email, "password": "testpass123"})},
        mock_context,
    )
    token = json.loads(login_resp["body"])["access_token"]
    return token, email


def _save_stats_with_training(handlers, mock_context, token, email, decisions, ts_suffix="001"):
    """Helper: save a stats item with training_decisions."""
    event = {
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({
            "result": "training_session",
            "mistakes": sum(0 if d.get("isCorrect") else 1 for d in decisions),
            "training_decisions": decisions,
        }),
    }
    return handlers["stats"].save(event, mock_context)


def _make_decision(category, is_correct, user_action="hit", optimal_action="hit"):
    return {
        "id": f"td_{category}_{is_correct}",
        "category": category,
        "scenarioKey": f"{category}_test",
        "userAction": user_action if is_correct else user_action,
        "optimalAction": optimal_action,
        "isCorrect": is_correct,
    }


# ============================================================
# Tests for stats.py: training_decisions field
# ============================================================

def test_save_stats_with_training_decisions(dynamodb_tables, mock_context):
    handlers = dynamodb_tables
    token, email = _signup_and_get_token(handlers, mock_context)

    decisions = [
        _make_decision("hard_total", True),
        _make_decision("soft_total", False, "hit", "stand"),
    ]

    resp = _save_stats_with_training(handlers, mock_context, token, email, decisions)
    assert resp["statusCode"] == 200

    # Verify stored in DynamoDB
    decoded = jwt.decode(token, os.environ["SECRET_KEY"], algorithms=["HS256"])
    table = boto3.resource("dynamodb").Table("TestStatsTable")
    items = table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key("userId").eq(decoded["sub"])
    )["Items"]
    assert len(items) == 1
    assert "training_decisions" in items[0]
    assert len(items[0]["training_decisions"]) == 2


def test_save_stats_without_training_decisions_backward_compatible(dynamodb_tables, mock_context):
    handlers = dynamodb_tables
    token, email = _signup_and_get_token(handlers, mock_context, "compat@example.com")

    event = {
        "headers": {"Authorization": f"Bearer {token}"},
        "body": json.dumps({"result": "loss", "mistakes": 0}),
    }
    resp = handlers["stats"].save(event, mock_context)
    assert resp["statusCode"] == 200

    decoded_compat = jwt.decode(token, os.environ["SECRET_KEY"], algorithms=["HS256"])
    table = boto3.resource("dynamodb").Table("TestStatsTable")
    items = table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key("userId").eq(decoded_compat["sub"])
    )["Items"]
    assert len(items) == 1
    assert "training_decisions" not in items[0]


# ============================================================
# Tests for training.py: get_summary
# ============================================================

def test_get_summary_no_data(dynamodb_tables, mock_context):
    handlers = dynamodb_tables
    token, email = _signup_and_get_token(handlers, mock_context, "nodata@example.com")

    event = {
        "headers": {"Authorization": f"Bearer {token}"},
        "queryStringParameters": {"game_type": "blackjack"},
    }
    resp = handlers["training"].get_summary(event, mock_context)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["total_decisions"] == 0
    assert body["overall_accuracy"] == 0


def test_get_summary_aggregates_correctly(dynamodb_tables, mock_context):
    handlers = dynamodb_tables
    token, email = _signup_and_get_token(handlers, mock_context, "summary@example.com")

    decisions = [
        _make_decision("hard_total", True),
        _make_decision("hard_total", True),
        _make_decision("hard_total", False, "hit", "stand"),
        _make_decision("soft_total", True),
        _make_decision("soft_total", False, "hit", "double"),
    ]
    _save_stats_with_training(handlers, mock_context, token, email, decisions)

    event = {
        "headers": {"Authorization": f"Bearer {token}"},
        "queryStringParameters": {"game_type": "blackjack"},
    }
    resp = handlers["training"].get_summary(event, mock_context)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])

    assert body["total_decisions"] == 5
    assert body["correct_decisions"] == 3
    assert body["overall_accuracy"] == 0.6

    # Category breakdown
    cats = {cs["category"]: cs for cs in body["category_stats"]}
    assert "hard_total" in cats
    assert cats["hard_total"]["total"] == 3
    assert cats["hard_total"]["correct"] == 2

    assert "soft_total" in cats
    assert cats["soft_total"]["total"] == 2
    assert cats["soft_total"]["correct"] == 1

    # Weakest categories sorted by accuracy
    assert len(body["weakest_categories"]) <= 3


def test_get_summary_unauthorized(dynamodb_tables, mock_context):
    handlers = dynamodb_tables
    event = {
        "headers": {},
        "queryStringParameters": {"game_type": "blackjack"},
    }
    resp = handlers["training"].get_summary(event, mock_context)
    assert resp["statusCode"] == 401


# ============================================================
# Tests for training.py: get_progress
# ============================================================

def test_get_progress_no_data(dynamodb_tables, mock_context):
    handlers = dynamodb_tables
    token, email = _signup_and_get_token(handlers, mock_context, "noprogress@example.com")

    event = {
        "headers": {"Authorization": f"Bearer {token}"},
        "queryStringParameters": {"game_type": "blackjack"},
    }
    resp = handlers["training"].get_progress(event, mock_context)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["snapshots"] == []


def test_get_progress_returns_snapshots(dynamodb_tables, mock_context):
    handlers = dynamodb_tables
    token, email = _signup_and_get_token(handlers, mock_context, "progress@example.com")

    # Save two stats items with training decisions
    decisions1 = [
        _make_decision("hard_total", True),
        _make_decision("hard_total", False, "hit", "stand"),
    ]
    _save_stats_with_training(handlers, mock_context, token, email, decisions1)

    decisions2 = [
        _make_decision("soft_total", True),
        _make_decision("soft_total", True),
        _make_decision("pair_split", True),
    ]
    _save_stats_with_training(handlers, mock_context, token, email, decisions2)

    event = {
        "headers": {"Authorization": f"Bearer {token}"},
        "queryStringParameters": {"game_type": "blackjack"},
    }
    resp = handlers["training"].get_progress(event, mock_context)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])

    # Both stats items had training_decisions, so 2 snapshots
    assert len(body["snapshots"]) == 2

    # First snapshot: 1/2 correct = 0.5
    assert body["snapshots"][0]["total_decisions"] == 2
    assert body["snapshots"][0]["overall_accuracy"] == 0.5

    # Second snapshot: 3/3 correct = 1.0
    assert body["snapshots"][1]["total_decisions"] == 3
    assert body["snapshots"][1]["overall_accuracy"] == 1.0


def test_get_progress_unauthorized(dynamodb_tables, mock_context):
    handlers = dynamodb_tables
    event = {
        "headers": {},
        "queryStringParameters": {"game_type": "blackjack"},
    }
    resp = handlers["training"].get_progress(event, mock_context)
    assert resp["statusCode"] == 401
