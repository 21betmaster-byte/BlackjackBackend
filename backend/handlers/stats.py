import json
import os
from datetime import datetime
import boto3

# --- Environment Variables ---
STATS_TABLE = os.getenv("STATS_TABLE", "StatsTable")

# --- AWS Clients ---
dynamodb = boto3.resource("dynamodb")
stats_table = dynamodb.Table(STATS_TABLE)

# --- Lambda Handler ---
def save(event, context):
    try:
        # The user ID should be extracted from the authorizer context
        # This assumes the JWT authorizer is configured to pass the user ID in the claims
        user_id = event["requestContext"]["authorizer"]["jwt"]["claims"]["sub"]
        
        body = json.loads(event["body"])
        result = body.get("result")
        mistakes = body.get("mistakes")

        if result not in ["win", "loss"] or not isinstance(mistakes, int):
            return {
                "statusCode": 400,
                "body": json.dumps({"detail": "Invalid stats data."}),
            }

        stats_table.put_item(
            Item={
                "userId": user_id,
                "timestamp": str(datetime.now()),
                "result": result,
                "mistakes": mistakes,
            }
        )

        return {
            "statusCode": 200,
            "body": json.dumps({"status": "saved"}),
        }

    except KeyError:
        # This error is likely due to the authorizer not being configured correctly or a missing token
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
