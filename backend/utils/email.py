import boto3
from botocore.exceptions import ClientError
from config import SES_REGION, SES_FROM_EMAIL, APP_NAME


def send_otp_email(email, otp):
    """Send OTP via SES. Falls back to console print if SES is unavailable."""
    try:
        ses = boto3.client("ses", region_name=SES_REGION)
        ses.send_email(
            Source=SES_FROM_EMAIL,
            Destination={"ToAddresses": [email]},
            Message={
                "Subject": {"Data": f"Your {APP_NAME} Password Reset Code"},
                "Body": {
                    "Text": {"Data": f"Your OTP code is: {otp}\n\nThis code expires in 10 minutes."},
                },
            },
        )
        return True
    except (ClientError, Exception) as e:
        print(f"[DEV] OTP for {email}: {otp} (SES error: {e})")
        return False
