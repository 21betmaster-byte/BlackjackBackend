import json
from datetime import datetime
from utils.database import get_stats_table

# --- Lambda Handler ---
def save(event, context):
    try:
        # The user ID should be extracted from the authorizer context
        user_id = event["requestContext"]["authorizer"]["jwt"]["claims"]["sub"]

        body = json.loads(event["body"])
        result = body.get("result")
        mistakes = body.get("mistakes")

        if result not in ["win", "loss", "push"] or not isinstance(mistakes, int):
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

        table = get_stats_table()
        table.put_item(Item=item)

        return {
            "statusCode": 200,
            "body": json.dumps({"status": "saved"}),
        }

    except KeyError:
        return {
            "statusCode": 401,
            "body": json.dumps({"detail": "Unauthorized"}),
        }
    except Exception as e:
        print(f"Save stats error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"detail": "An unexpected error occurred."}),
        }
