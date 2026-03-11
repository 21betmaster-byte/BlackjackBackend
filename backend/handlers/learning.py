"""Learning progress endpoints.

Provides persistence for the learning card journey so users can
resume across devices and we can track engagement analytics.

Endpoints:
    PUT  /learning/progress  — Save or update learning progress for a game
    GET  /learning/progress  — Get learning progress for a game
    GET  /learning/summary   — Get learning summary across all games
"""

import json
from decimal import Decimal
from datetime import datetime
from boto3.dynamodb.conditions import Key
from utils.database import get_learning_table
from utils.auth import decode_access_token


class DecimalEncoder(json.JSONEncoder):
    """Handle DynamoDB Decimal types in JSON serialization."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            if obj % 1 == 0:
                return int(obj)
            return float(obj)
        return super().default(obj)


def _get_user_id_from_token(event):
    """Extract user ID (sub) from the Authorization Bearer token."""
    auth_header = (
        event.get("headers", {}).get("authorization", "")
        or event.get("headers", {}).get("Authorization", "")
    )
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    payload = decode_access_token(token)
    if not payload:
        return None
    return payload.get("sub")


VALID_SKILL_LEVELS = {"beginner", "amateur", "pro"}


def save_progress(event, context):
    """PUT /learning/progress

    Save or update learning progress for a specific game.

    Body:
        game_type: str          — e.g. "blackjack"
        skill_level: str        — "beginner" | "amateur" | "pro"
        completed_card_ids: list — card IDs swiped right
        quiz_results: dict      — {cardId: {correct: bool, answeredAt: int}}
        completed: bool         — whether the full deck is done
    """
    try:
        user_id = _get_user_id_from_token(event)
        if not user_id:
            return {
                "statusCode": 401,
                "body": json.dumps({"detail": "Unauthorized"}),
            }

        body = json.loads(event["body"])
        game_type = body.get("game_type")
        skill_level = body.get("skill_level")
        completed_card_ids = body.get("completed_card_ids")
        quiz_results = body.get("quiz_results", {})
        completed = body.get("completed", False)

        if not game_type or not isinstance(game_type, str):
            return {
                "statusCode": 400,
                "body": json.dumps({"detail": "game_type is required."}),
            }

        if skill_level not in VALID_SKILL_LEVELS:
            return {
                "statusCode": 400,
                "body": json.dumps(
                    {"detail": f"skill_level must be one of: {', '.join(VALID_SKILL_LEVELS)}"}
                ),
            }

        if not isinstance(completed_card_ids, list):
            return {
                "statusCode": 400,
                "body": json.dumps({"detail": "completed_card_ids must be a list."}),
            }

        table = get_learning_table()
        now = str(datetime.utcnow())

        item = {
            "userId": user_id,
            "gameType": game_type,
            "skillLevel": skill_level,
            "completedCardIds": completed_card_ids,
            "quizResults": quiz_results,
            "completed": completed,
            "updatedAt": now,
        }

        # Preserve startedAt on updates
        existing = table.get_item(
            Key={"userId": user_id, "gameType": game_type}
        ).get("Item")

        if existing and existing.get("startedAt"):
            item["startedAt"] = existing["startedAt"]
        else:
            item["startedAt"] = now

        if completed:
            item["completedAt"] = now

        table.put_item(Item=item)

        return {
            "statusCode": 200,
            "body": json.dumps({"status": "saved"}),
        }

    except Exception as e:
        print(f"Save learning progress error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"detail": "An unexpected error occurred."}),
        }


def get_progress(event, context):
    """GET /learning/progress?game_type=blackjack

    Returns the user's learning progress for a specific game.
    """
    try:
        user_id = _get_user_id_from_token(event)
        if not user_id:
            return {
                "statusCode": 401,
                "body": json.dumps({"detail": "Unauthorized"}),
            }

        params = event.get("queryStringParameters") or {}
        game_type = params.get("game_type")

        if not game_type:
            return {
                "statusCode": 400,
                "body": json.dumps({"detail": "game_type query parameter is required."}),
            }

        table = get_learning_table()
        result = table.get_item(
            Key={"userId": user_id, "gameType": game_type}
        )
        item = result.get("Item")

        if not item:
            return {
                "statusCode": 200,
                "body": json.dumps(None),
            }

        return {
            "statusCode": 200,
            "body": json.dumps({
                "game_type": item.get("gameType"),
                "skill_level": item.get("skillLevel"),
                "completed_card_ids": item.get("completedCardIds", []),
                "quiz_results": item.get("quizResults", {}),
                "completed": item.get("completed", False),
                "started_at": item.get("startedAt"),
                "completed_at": item.get("completedAt"),
            }, cls=DecimalEncoder),
        }

    except Exception as e:
        print(f"Get learning progress error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"detail": "An unexpected error occurred."}),
        }


def get_summary(event, context):
    """GET /learning/summary

    Returns learning progress across all games for the user.
    """
    try:
        user_id = _get_user_id_from_token(event)
        if not user_id:
            return {
                "statusCode": 401,
                "body": json.dumps({"detail": "Unauthorized"}),
            }

        table = get_learning_table()
        result = table.query(
            KeyConditionExpression=Key("userId").eq(user_id),
        )
        items = result.get("Items", [])

        games = []
        for item in items:
            quiz_results = item.get("quizResults", {})
            quiz_total = len(quiz_results)
            quiz_correct = sum(
                1 for q in quiz_results.values()
                if isinstance(q, dict) and q.get("correct", False)
            )

            games.append({
                "game_type": item.get("gameType"),
                "skill_level": item.get("skillLevel"),
                "cards_completed": len(item.get("completedCardIds", [])),
                "quiz_score": {"correct": quiz_correct, "total": quiz_total},
                "completed": item.get("completed", False),
                "started_at": item.get("startedAt"),
                "completed_at": item.get("completedAt"),
            })

        return {
            "statusCode": 200,
            "body": json.dumps({
                "games": games,
                "total_games_started": len(games),
                "total_games_completed": sum(1 for g in games if g["completed"]),
            }, cls=DecimalEncoder),
        }

    except Exception as e:
        print(f"Learning summary error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"detail": "An unexpected error occurred."}),
        }
