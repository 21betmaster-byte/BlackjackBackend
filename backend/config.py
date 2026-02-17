import os

# --- App Identity ---
APP_NAME = os.getenv("APP_NAME", "BetMaster21")

# --- JWT / Auth ---
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
RESET_TOKEN_EXPIRE_MINUTES = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "5"))

# --- DynamoDB Tables ---
USERS_TABLE = os.getenv("USERS_TABLE", "UsersTable")
STATS_TABLE = os.getenv("STATS_TABLE", "StatsTable")

# --- SES Email ---
SES_REGION = os.getenv("SES_REGION", "us-east-1")
SES_FROM_EMAIL = os.getenv("SES_FROM_EMAIL", "noreply@betmaster21.com")
