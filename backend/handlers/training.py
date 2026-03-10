import json
from boto3.dynamodb.conditions import Key
from utils.database import get_stats_table
from utils.auth import decode_access_token


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


def get_summary(event, context):
    """GET /training/summary?game_type=blackjack&period=all|week|month

    Aggregates training decisions across stored stats items.
    Returns overall accuracy, category breakdown, and weakest scenarios.
    """
    try:
        user_id = _get_user_id_from_token(event)
        if not user_id:
            return {
                "statusCode": 401,
                "body": json.dumps({"detail": "Unauthorized"}),
            }

        params = event.get("queryStringParameters") or {}
        game_type = params.get("game_type", "blackjack")

        table = get_stats_table()
        response = table.query(
            KeyConditionExpression=Key("userId").eq(user_id),
            ScanIndexForward=False,
            Limit=500,
        )
        items = response.get("Items", [])

        # Collect all training decisions
        all_decisions = []
        for item in items:
            decisions = item.get("training_decisions", [])
            if isinstance(decisions, list):
                all_decisions.extend(decisions)

        if not all_decisions:
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "game_type": game_type,
                    "total_decisions": 0,
                    "correct_decisions": 0,
                    "overall_accuracy": 0,
                    "category_stats": [],
                    "weakest_categories": [],
                }),
            }

        # Aggregate
        total = len(all_decisions)
        correct = sum(1 for d in all_decisions if d.get("isCorrect", False))
        accuracy = correct / total if total > 0 else 0

        # Group by category
        categories = {}
        for d in all_decisions:
            cat = d.get("category", "unknown")
            if cat not in categories:
                categories[cat] = {"total": 0, "correct": 0}
            categories[cat]["total"] += 1
            if d.get("isCorrect", False):
                categories[cat]["correct"] += 1

        category_stats = []
        for cat, stats in categories.items():
            cat_accuracy = stats["correct"] / stats["total"] if stats["total"] > 0 else 0
            category_stats.append({
                "category": cat,
                "total": stats["total"],
                "correct": stats["correct"],
                "accuracy": round(cat_accuracy, 4),
            })

        # Sort weakest first
        category_stats.sort(key=lambda x: x["accuracy"])
        weakest = [cs["category"] for cs in category_stats[:3]]

        return {
            "statusCode": 200,
            "body": json.dumps({
                "game_type": game_type,
                "total_decisions": total,
                "correct_decisions": correct,
                "overall_accuracy": round(accuracy, 4),
                "category_stats": category_stats,
                "weakest_categories": weakest,
            }),
        }

    except Exception as e:
        print(f"Training summary error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"detail": "An unexpected error occurred."}),
        }


def get_progress(event, context):
    """GET /training/progress?game_type=blackjack

    Returns per-session accuracy snapshots for trend visualization.
    Each stats item that has training_decisions becomes one data point.
    """
    try:
        user_id = _get_user_id_from_token(event)
        if not user_id:
            return {
                "statusCode": 401,
                "body": json.dumps({"detail": "Unauthorized"}),
            }

        params = event.get("queryStringParameters") or {}
        game_type = params.get("game_type", "blackjack")

        table = get_stats_table()
        response = table.query(
            KeyConditionExpression=Key("userId").eq(user_id),
            ScanIndexForward=True,
            Limit=500,
        )
        items = response.get("Items", [])

        snapshots = []
        for item in items:
            decisions = item.get("training_decisions", [])
            if not isinstance(decisions, list) or len(decisions) == 0:
                continue

            total = len(decisions)
            correct = sum(1 for d in decisions if d.get("isCorrect", False))
            accuracy = correct / total if total > 0 else 0

            snapshots.append({
                "timestamp": item.get("timestamp", ""),
                "total_decisions": total,
                "correct_decisions": correct,
                "overall_accuracy": round(accuracy, 4),
            })

        return {
            "statusCode": 200,
            "body": json.dumps({
                "game_type": game_type,
                "snapshots": snapshots,
            }),
        }

    except Exception as e:
        print(f"Training progress error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"detail": "An unexpected error occurred."}),
        }
