import boto3
from config import USERS_TABLE, STATS_TABLE


def get_users_table():
    """Return the DynamoDB Table resource for users."""
    dynamodb = boto3.resource("dynamodb")
    return dynamodb.Table(USERS_TABLE)


def get_stats_table():
    """Return the DynamoDB Table resource for stats."""
    dynamodb = boto3.resource("dynamodb")
    return dynamodb.Table(STATS_TABLE)
