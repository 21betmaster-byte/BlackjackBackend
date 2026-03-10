import json
from datetime import datetime
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


VALID_RESULTS = {"win", "loss", "push", "training_session"}


# --- Lambda Handler ---
def save(event, context):
    try:
        user_id = _get_user_id_from_token(event)
        if not user_id:
            return {
                "statusCode": 401,
                "body": json.dumps({"detail": "Unauthorized"}),
            }

        body = json.loads(event["body"])
        result = body.get("result")
        mistakes = body.get("mistakes")

        if result not in VALID_RESULTS or not isinstance(mistakes, int):
            return {
                "statusCode": 400,
                "body": json.dumps({"detail": "Invalid stats data."}),
            }

        item = {
            "userId": user_id,
            "timestamp": str(datetime.now()),
            "result": result,
            "mistakes": mistakes,
        }

        # Optional extended fields (backward compatible)
        if "net_payout" in body and isinstance(body["net_payout"], (int, float)):
            item["net_payout"] = int(body["net_payout"])
        if "hands_played" in body and isinstance(body["hands_played"], int):
            item["hands_played"] = body["hands_played"]
        if "details" in body and isinstance(body["details"], dict):
            item["details"] = body["details"]
        if "training_decisions" in body and isinstance(body["training_decisions"], list):
            item["training_decisions"] = body["training_decisions"]

        table = get_stats_table()
        table.put_item(Item=item)

        return {
            "statusCode": 200,
            "body": json.dumps({"status": "saved"}),
        }

    except Exception as e:
        print(f"Save stats error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"detail": "An unexpected error occurred."}),
        }
