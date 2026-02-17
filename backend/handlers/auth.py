import json
import uuid
from datetime import datetime, timedelta
from utils.auth import (
    get_password_hash, verify_password, create_access_token, ALGORITHM,
    generate_otp, create_reset_token, verify_reset_token,
)
from utils.email import send_otp_email
from utils.database import get_users_table

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

        table = get_users_table()

        # Check if user already exists
        response = table.get_item(Key={"email": email})
        if "Item" in response:
            return {
                "statusCode": 400,
                "body": json.dumps({"detail": "Email already exists."}),
            }

        hashed_password = get_password_hash(password)
        user_id = str(uuid.uuid4())

        table.put_item(
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

        table = get_users_table()
        response = table.get_item(Key={"email": email})
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

        table = get_users_table()
        response = table.get_item(Key={"email": email})

        mandatory_details_completed = False
        if "Item" in response:
            # Existing user — generate token and return
            user = response["Item"]
            access_token = create_access_token(data={"sub": user["id"], "email": email})
            mandatory_details_completed = bool(user.get("mandatory_details_completed", False))
        else:
            # New user — create account without password
            user_id = str(uuid.uuid4())
            table.put_item(
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

        table = get_users_table()
        table.update_item(
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

        table = get_users_table()
        response = table.get_item(Key={"email": email})
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


def get_profile(event, context):
    try:
        email = _get_email_from_token(event)
        if not email:
            return {"statusCode": 401, "body": json.dumps({"detail": "Unauthorized"})}

        table = get_users_table()
        response = table.get_item(Key={"email": email})
        if "Item" not in response:
            return {"statusCode": 404, "body": json.dumps({"detail": "User not found."})}

        user = response["Item"]
        return {
            "statusCode": 200,
            "body": json.dumps({
                "first_name": user.get("first_name", ""),
                "last_name": user.get("last_name", ""),
                "dob": user.get("dob", ""),
                "country": user.get("country", ""),
                "email": email,
                "auth_provider": user.get("auth_provider", "email"),
            }),
        }
    except Exception as e:
        print(f"Get profile error: {e}")
        return {"statusCode": 500, "body": json.dumps({"detail": "An unexpected error occurred."})}


def update_profile(event, context):
    try:
        email = _get_email_from_token(event)
        if not email:
            return {"statusCode": 401, "body": json.dumps({"detail": "Unauthorized"})}

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

        table = get_users_table()
        table.update_item(
            Key={"email": email},
            UpdateExpression="SET first_name = :fn, last_name = :ln, dob = :dob, country = :c, updated_at = :ua",
            ExpressionAttributeValues={
                ":fn": first_name,
                ":ln": last_name,
                ":dob": dob,
                ":c": country,
                ":ua": str(datetime.now()),
            },
        )
        return {"statusCode": 200, "body": json.dumps({"status": "saved"})}

    except Exception as e:
        print(f"Update profile error: {e}")
        return {"statusCode": 500, "body": json.dumps({"detail": "An unexpected error occurred."})}


def change_password(event, context):
    try:
        email = _get_email_from_token(event)
        if not email:
            return {"statusCode": 401, "body": json.dumps({"detail": "Unauthorized"})}

        body = json.loads(event["body"])
        new_password = body.get("new_password", "")
        current_password = body.get("current_password")

        if not new_password or len(new_password) < 8:
            return {"statusCode": 400, "body": json.dumps({"detail": "New password must be at least 8 characters."})}

        table = get_users_table()
        response = table.get_item(Key={"email": email})
        if "Item" not in response:
            return {"statusCode": 404, "body": json.dumps({"detail": "User not found."})}

        user = response["Item"]
        auth_provider = user.get("auth_provider", "email")

        # Email users must provide current password
        if "password" in user:
            if not current_password:
                return {"statusCode": 400, "body": json.dumps({"detail": "Current password is required."})}
            if not verify_password(current_password, user["password"]):
                return {"statusCode": 400, "body": json.dumps({"detail": "Current password is incorrect."})}

        # Google-only users setting password for first time: no current_password needed

        hashed = get_password_hash(new_password)
        update_expr = "SET password = :pw, updated_at = :ua"
        expr_values = {":pw": hashed, ":ua": str(datetime.now())}

        # If Google-only user, also add email to auth_provider
        if auth_provider == "google" and "password" not in user:
            update_expr += ", auth_provider = :ap"
            expr_values[":ap"] = "google,email"

        table.update_item(
            Key={"email": email},
            UpdateExpression=update_expr,
            ExpressionAttributeValues=expr_values,
        )
        return {"statusCode": 200, "body": json.dumps({"status": "updated"})}

    except Exception as e:
        print(f"Change password error: {e}")
        return {"statusCode": 500, "body": json.dumps({"detail": "An unexpected error occurred."})}


def forgot_password(event, context):
    try:
        body = json.loads(event["body"])
        email = body.get("email", "").strip().lower()

        if not email:
            return {"statusCode": 400, "body": json.dumps({"detail": "Email is required."})}

        table = get_users_table()

        # Always return 200 to prevent email enumeration
        response = table.get_item(Key={"email": email})
        if "Item" not in response:
            return {"statusCode": 200, "body": json.dumps({"status": "sent"})}

        user = response["Item"]

        # Rate limiting: max 5 OTP requests per hour
        now = datetime.utcnow()
        otp_window = user.get("otp_request_window", "")
        otp_count = int(user.get("otp_request_count", 0))

        if otp_window:
            window_start = datetime.fromisoformat(otp_window)
            if now - window_start < timedelta(hours=1):
                if otp_count >= 5:
                    return {"statusCode": 429, "body": json.dumps({"detail": "Too many requests. Try again later."})}
                otp_count += 1
            else:
                # Window expired, reset
                otp_count = 1
                otp_window = now.isoformat()
        else:
            otp_count = 1
            otp_window = now.isoformat()

        otp = generate_otp()
        otp_expires_at = (now + timedelta(minutes=10)).isoformat()

        table.update_item(
            Key={"email": email},
            UpdateExpression="SET otp_code = :otp, otp_expires_at = :exp, otp_request_count = :cnt, otp_request_window = :win",
            ExpressionAttributeValues={
                ":otp": otp,
                ":exp": otp_expires_at,
                ":cnt": otp_count,
                ":win": otp_window,
            },
        )

        email_sent = send_otp_email(email, otp)
        response_body = {"status": "sent"}
        if not email_sent:
            # SES not configured — include OTP in response for dev/testing
            response_body["dev_otp"] = otp
        return {"statusCode": 200, "body": json.dumps(response_body)}

    except Exception as e:
        print(f"Forgot password error: {e}")
        return {"statusCode": 500, "body": json.dumps({"detail": "An unexpected error occurred."})}


def verify_otp(event, context):
    try:
        body = json.loads(event["body"])
        email = body.get("email", "").strip().lower()
        otp = body.get("otp", "").strip()

        if not email or not otp:
            return {"statusCode": 400, "body": json.dumps({"detail": "Email and OTP are required."})}

        table = get_users_table()
        response = table.get_item(Key={"email": email})
        if "Item" not in response:
            return {"statusCode": 400, "body": json.dumps({"detail": "Invalid OTP."})}

        user = response["Item"]
        stored_otp = user.get("otp_code", "")
        otp_expires_at = user.get("otp_expires_at", "")

        if not stored_otp or stored_otp != otp:
            return {"statusCode": 400, "body": json.dumps({"detail": "Invalid OTP."})}

        if otp_expires_at:
            expiry = datetime.fromisoformat(otp_expires_at)
            if datetime.utcnow() > expiry:
                return {"statusCode": 400, "body": json.dumps({"detail": "OTP has expired."})}

        # Clear OTP fields
        table.update_item(
            Key={"email": email},
            UpdateExpression="REMOVE otp_code, otp_expires_at",
        )

        reset_token = create_reset_token(email)
        return {"statusCode": 200, "body": json.dumps({"reset_token": reset_token})}

    except Exception as e:
        print(f"Verify OTP error: {e}")
        return {"statusCode": 500, "body": json.dumps({"detail": "An unexpected error occurred."})}


def reset_password(event, context):
    try:
        body = json.loads(event["body"])
        token = body.get("reset_token", "")
        new_password = body.get("new_password", "")

        if not token or not new_password:
            return {"statusCode": 400, "body": json.dumps({"detail": "Reset token and new password are required."})}

        if len(new_password) < 8:
            return {"statusCode": 400, "body": json.dumps({"detail": "Password must be at least 8 characters."})}

        email = verify_reset_token(token)
        if not email:
            return {"statusCode": 401, "body": json.dumps({"detail": "Invalid or expired reset token."})}

        table = get_users_table()
        response = table.get_item(Key={"email": email})
        if "Item" not in response:
            return {"statusCode": 401, "body": json.dumps({"detail": "Invalid or expired reset token."})}

        user = response["Item"]
        hashed = get_password_hash(new_password)

        table.update_item(
            Key={"email": email},
            UpdateExpression="SET password = :pw, updated_at = :ua",
            ExpressionAttributeValues={
                ":pw": hashed,
                ":ua": str(datetime.now()),
            },
        )

        # Auto-login: generate access token
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
        print(f"Reset password error: {e}")
        return {"statusCode": 500, "body": json.dumps({"detail": "An unexpected error occurred."})}
