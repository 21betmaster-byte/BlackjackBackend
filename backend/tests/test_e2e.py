"""End-to-end flow tests for the BetMaster21 backend.

These tests exercise complete user journeys across multiple endpoints,
verifying that data flows correctly between auth, stats, and training
handlers — as a real client would use the API.
"""

import json
import os
import boto3
from datetime import datetime, timedelta
from jose import jwt

from tests.conftest import (
    signup_user,
    login_user,
    signup_and_login,
    make_auth_event,
)


# ============================================================
# Flow 1: Full Registration → Onboarding → Profile Journey
# ============================================================


class TestAuthOnboardingFlow:
    """Tests the complete user registration through onboarding flow."""

    def test_signup_login_onboarding_profile(self, dynamodb_tables, mock_context):
        """Full journey: signup → login → mandatory details → profile read → profile update."""
        h, ctx = dynamodb_tables, mock_context

        # Step 1: Sign up
        resp = signup_user(h, ctx, "journey@example.com", "securePass123")
        assert resp["statusCode"] == 201
        user_id = json.loads(resp["body"])["user_id"]

        # Step 2: Login — mandatory_details_completed should be False
        resp = login_user(h, ctx, "journey@example.com", "securePass123")
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        token = body["access_token"]
        assert body["mandatory_details_completed"] is False
        assert body["token_type"] == "bearer"

        # Step 3: Get mandatory details — should be empty
        resp = h["auth"].get_mandatory_details(
            make_auth_event(token), ctx
        )
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["mandatory_details_completed"] is False
        assert body["first_name"] == ""

        # Step 4: Save mandatory details
        resp = h["auth"].save_mandatory_details(
            make_auth_event(token, body={
                "first_name": "Alice",
                "last_name": "Johnson",
                "dob": "03 / 15 / 1992",
                "country": "United States",
            }),
            ctx,
        )
        assert resp["statusCode"] == 200

        # Step 5: Login again — mandatory_details_completed should be True
        resp = login_user(h, ctx, "journey@example.com", "securePass123")
        body = json.loads(resp["body"])
        assert body["mandatory_details_completed"] is True

        # Step 6: Get profile — should have all details
        token2 = body["access_token"]
        resp = h["auth"].get_profile(make_auth_event(token2), ctx)
        assert resp["statusCode"] == 200
        profile = json.loads(resp["body"])
        assert profile["first_name"] == "Alice"
        assert profile["last_name"] == "Johnson"
        assert profile["email"] == "journey@example.com"
        assert profile["auth_provider"] == "email"

        # Step 7: Update profile
        resp = h["auth"].update_profile(
            make_auth_event(token2, body={
                "first_name": "Alice",
                "last_name": "Smith",
                "dob": "03 / 15 / 1992",
                "country": "Canada",
            }),
            ctx,
        )
        assert resp["statusCode"] == 200

        # Step 8: Verify profile update
        resp = h["auth"].get_profile(make_auth_event(token2), ctx)
        profile = json.loads(resp["body"])
        assert profile["last_name"] == "Smith"
        assert profile["country"] == "Canada"

    def test_google_auth_then_set_password(self, dynamodb_tables, mock_context):
        """Google OAuth user sets a password and can then login with email/password."""
        h, ctx = dynamodb_tables, mock_context

        # Step 1: Google auth (creates new user)
        resp = h["auth"].google_auth(
            {"body": json.dumps({
                "email": "guser@gmail.com",
                "google_id": "g_abc123",
                "name": "Google User",
            })},
            ctx,
        )
        assert resp["statusCode"] == 200
        token = json.loads(resp["body"])["access_token"]

        # Step 2: Set password (no current_password needed for Google-only user)
        resp = h["auth"].change_password(
            make_auth_event(token, body={"new_password": "myNewPass123"}),
            ctx,
        )
        assert resp["statusCode"] == 200

        # Step 3: Login with email/password
        resp = login_user(h, ctx, "guser@gmail.com", "myNewPass123")
        assert resp["statusCode"] == 200
        assert "access_token" in json.loads(resp["body"])

        # Step 4: Google auth still works
        resp = h["auth"].google_auth(
            {"body": json.dumps({"email": "guser@gmail.com", "google_id": "g_abc123"})},
            ctx,
        )
        assert resp["statusCode"] == 200


# ============================================================
# Flow 2: Password Reset Journey
# ============================================================


class TestPasswordResetFlow:
    """Tests the complete forgot password → OTP → reset → login flow."""

    def test_full_password_reset_flow(self, dynamodb_tables, mock_context):
        """forgot password → verify OTP → reset password → login with new password."""
        h, ctx = dynamodb_tables, mock_context

        # Setup: create user
        signup_and_login(h, ctx, "reset@example.com", "oldPassword123")

        # Step 1: Request password reset
        resp = h["auth"].forgot_password(
            {"body": json.dumps({"email": "reset@example.com"})}, ctx
        )
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert body["status"] == "sent"
        otp = body["dev_otp"]
        assert len(otp) == 6

        # Step 2: Verify OTP
        resp = h["auth"].verify_otp(
            {"body": json.dumps({"email": "reset@example.com", "otp": otp})}, ctx
        )
        assert resp["statusCode"] == 200
        reset_token = json.loads(resp["body"])["reset_token"]

        # Step 3: Reset password
        resp = h["auth"].reset_password(
            {"body": json.dumps({
                "reset_token": reset_token,
                "new_password": "brandNewPass456",
            })},
            ctx,
        )
        assert resp["statusCode"] == 200
        body = json.loads(resp["body"])
        assert "access_token" in body  # Auto-login after reset

        # Step 4: Old password no longer works
        resp = login_user(h, ctx, "reset@example.com", "oldPassword123")
        assert resp["statusCode"] == 401

        # Step 5: New password works
        resp = login_user(h, ctx, "reset@example.com", "brandNewPass456")
        assert resp["statusCode"] == 200
        assert "access_token" in json.loads(resp["body"])

    def test_password_reset_invalid_otp_then_correct(self, dynamodb_tables, mock_context):
        """Wrong OTP fails, then correct OTP succeeds."""
        h, ctx = dynamodb_tables, mock_context

        signup_and_login(h, ctx, "otp_retry@example.com", "pass123pass")

        resp = h["auth"].forgot_password(
            {"body": json.dumps({"email": "otp_retry@example.com"})}, ctx
        )
        otp = json.loads(resp["body"])["dev_otp"]

        # Wrong OTP
        resp = h["auth"].verify_otp(
            {"body": json.dumps({"email": "otp_retry@example.com", "otp": "000000"})}, ctx
        )
        assert resp["statusCode"] == 400

        # Correct OTP (still valid since it hasn't been consumed)
        resp = h["auth"].verify_otp(
            {"body": json.dumps({"email": "otp_retry@example.com", "otp": otp})}, ctx
        )
        assert resp["statusCode"] == 200

    def test_password_change_then_reset_flow(self, dynamodb_tables, mock_context):
        """Change password via authenticated endpoint, then reset via OTP flow."""
        h, ctx = dynamodb_tables, mock_context

        token, uid, email = signup_and_login(h, ctx, "combo@example.com", "firstPass123")

        # Change password (authenticated)
        resp = h["auth"].change_password(
            make_auth_event(token, body={
                "current_password": "firstPass123",
                "new_password": "secondPass123",
            }),
            ctx,
        )
        assert resp["statusCode"] == 200

        # Login with changed password
        resp = login_user(h, ctx, email, "secondPass123")
        assert resp["statusCode"] == 200

        # Now use forgot password flow
        resp = h["auth"].forgot_password(
            {"body": json.dumps({"email": email})}, ctx
        )
        otp = json.loads(resp["body"])["dev_otp"]

        resp = h["auth"].verify_otp(
            {"body": json.dumps({"email": email, "otp": otp})}, ctx
        )
        reset_token = json.loads(resp["body"])["reset_token"]

        resp = h["auth"].reset_password(
            {"body": json.dumps({
                "reset_token": reset_token,
                "new_password": "thirdPass123",
            })},
            ctx,
        )
        assert resp["statusCode"] == 200

        # Only the latest password works
        assert login_user(h, ctx, email, "secondPass123")["statusCode"] == 401
        assert login_user(h, ctx, email, "thirdPass123")["statusCode"] == 200


# ============================================================
# Flow 3: Gameplay → Stats → Training Analytics
# ============================================================


class TestGameplayTrainingFlow:
    """Tests the complete gameplay → stats save → training analytics pipeline."""

    def _make_decisions(self, categories_correct):
        """Build a list of training decision dicts.
        categories_correct: list of (category, is_correct) tuples.
        """
        decisions = []
        for i, (cat, correct) in enumerate(categories_correct):
            decisions.append({
                "id": f"td_{i}",
                "category": cat,
                "scenarioKey": f"{cat}_test_{i}",
                "userAction": "hit" if correct else "stand",
                "optimalAction": "hit",
                "isCorrect": correct,
            })
        return decisions

    def test_single_session_stats_and_summary(self, dynamodb_tables, mock_context):
        """Play one session → save stats → verify training summary."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, email = signup_and_login(h, ctx, "player@example.com")

        decisions = self._make_decisions([
            ("hard_total", True),
            ("hard_total", True),
            ("hard_total", False),
            ("soft_total", True),
            ("soft_total", False),
            ("pair_split", True),
        ])

        # Save stats with training decisions
        resp = h["stats"].save(
            make_auth_event(token, body={
                "result": "win",
                "mistakes": 2,
                "training_decisions": decisions,
            }),
            ctx,
        )
        assert resp["statusCode"] == 200

        # Get training summary
        resp = h["training"].get_summary(
            make_auth_event(token, query_params={"game_type": "blackjack"}),
            ctx,
        )
        assert resp["statusCode"] == 200
        summary = json.loads(resp["body"])

        assert summary["total_decisions"] == 6
        assert summary["correct_decisions"] == 4
        assert abs(summary["overall_accuracy"] - (4 / 6)) < 0.01

        cats = {c["category"]: c for c in summary["category_stats"]}
        assert cats["hard_total"]["total"] == 3
        assert cats["hard_total"]["correct"] == 2
        assert cats["soft_total"]["total"] == 2
        assert cats["soft_total"]["correct"] == 1
        assert cats["pair_split"]["total"] == 1
        assert cats["pair_split"]["correct"] == 1

    def test_multi_session_progress_tracking(self, dynamodb_tables, mock_context):
        """Multiple sessions → verify progress snapshots track improvement."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, email = signup_and_login(h, ctx, "progress@example.com")

        # Session 1: 50% accuracy (2/4)
        decisions1 = self._make_decisions([
            ("hard_total", True),
            ("hard_total", False),
            ("soft_total", True),
            ("soft_total", False),
        ])
        h["stats"].save(
            make_auth_event(token, body={
                "result": "loss",
                "mistakes": 2,
                "training_decisions": decisions1,
            }),
            ctx,
        )

        # Session 2: 75% accuracy (3/4)
        decisions2 = self._make_decisions([
            ("hard_total", True),
            ("hard_total", True),
            ("soft_total", True),
            ("soft_total", False),
        ])
        h["stats"].save(
            make_auth_event(token, body={
                "result": "win",
                "mistakes": 1,
                "training_decisions": decisions2,
            }),
            ctx,
        )

        # Session 3: 100% accuracy (4/4)
        decisions3 = self._make_decisions([
            ("hard_total", True),
            ("hard_total", True),
            ("pair_split", True),
            ("insurance", True),
        ])
        h["stats"].save(
            make_auth_event(token, body={
                "result": "win",
                "mistakes": 0,
                "training_decisions": decisions3,
            }),
            ctx,
        )

        # Verify progress shows 3 snapshots with improving accuracy
        resp = h["training"].get_progress(
            make_auth_event(token, query_params={"game_type": "blackjack"}),
            ctx,
        )
        assert resp["statusCode"] == 200
        progress = json.loads(resp["body"])
        snapshots = progress["snapshots"]

        assert len(snapshots) == 3
        assert snapshots[0]["overall_accuracy"] == 0.5
        assert snapshots[1]["overall_accuracy"] == 0.75
        assert snapshots[2]["overall_accuracy"] == 1.0

        # Verify cumulative summary
        resp = h["training"].get_summary(
            make_auth_event(token, query_params={"game_type": "blackjack"}),
            ctx,
        )
        summary = json.loads(resp["body"])
        assert summary["total_decisions"] == 12
        assert summary["correct_decisions"] == 9

    def test_stats_without_training_does_not_affect_analytics(
        self, dynamodb_tables, mock_context
    ):
        """Stats saved without training_decisions don't appear in training analytics."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, email = signup_and_login(h, ctx, "plain@example.com")

        # Save plain stats (no training_decisions)
        h["stats"].save(
            make_auth_event(token, body={"result": "win", "mistakes": 0}), ctx
        )
        h["stats"].save(
            make_auth_event(token, body={"result": "loss", "mistakes": 3}), ctx
        )

        # Training endpoints return empty
        resp = h["training"].get_summary(
            make_auth_event(token, query_params={"game_type": "blackjack"}), ctx
        )
        summary = json.loads(resp["body"])
        assert summary["total_decisions"] == 0

        resp = h["training"].get_progress(
            make_auth_event(token, query_params={"game_type": "blackjack"}), ctx
        )
        progress = json.loads(resp["body"])
        assert progress["snapshots"] == []

    def test_mixed_stats_and_training_sessions(self, dynamodb_tables, mock_context):
        """Mix of plain stats and training stats — only training sessions counted."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, email = signup_and_login(h, ctx, "mixed@example.com")

        # Plain stats
        h["stats"].save(
            make_auth_event(token, body={"result": "win", "mistakes": 0}), ctx
        )

        # Training stats
        decisions = self._make_decisions([
            ("hard_total", True),
            ("hard_total", True),
        ])
        h["stats"].save(
            make_auth_event(token, body={
                "result": "win",
                "mistakes": 0,
                "training_decisions": decisions,
            }),
            ctx,
        )

        # More plain stats
        h["stats"].save(
            make_auth_event(token, body={"result": "push", "mistakes": 1}), ctx
        )

        resp = h["training"].get_summary(
            make_auth_event(token, query_params={"game_type": "blackjack"}), ctx
        )
        summary = json.loads(resp["body"])
        assert summary["total_decisions"] == 2
        assert summary["correct_decisions"] == 2

        resp = h["training"].get_progress(
            make_auth_event(token, query_params={"game_type": "blackjack"}), ctx
        )
        assert len(json.loads(resp["body"])["snapshots"]) == 1


# ============================================================
# Flow 4: Multi-User Isolation
# ============================================================


class TestMultiUserIsolation:
    """Verify that data is properly isolated between users."""

    def test_users_cannot_see_each_other_stats(self, dynamodb_tables, mock_context):
        """Two users save stats — each only sees their own training data."""
        h, ctx = dynamodb_tables, mock_context

        token_a, uid_a, _ = signup_and_login(h, ctx, "alice@example.com")
        token_b, uid_b, _ = signup_and_login(h, ctx, "bob@example.com")

        # Alice saves 3 correct decisions
        h["stats"].save(
            make_auth_event(token_a, body={
                "result": "win",
                "mistakes": 0,
                "training_decisions": [
                    {"id": "a1", "category": "hard_total", "scenarioKey": "ht_1",
                     "userAction": "hit", "optimalAction": "hit", "isCorrect": True},
                    {"id": "a2", "category": "hard_total", "scenarioKey": "ht_2",
                     "userAction": "hit", "optimalAction": "hit", "isCorrect": True},
                    {"id": "a3", "category": "soft_total", "scenarioKey": "st_1",
                     "userAction": "stand", "optimalAction": "stand", "isCorrect": True},
                ],
            }),
            ctx,
        )

        # Bob saves 2 incorrect decisions
        h["stats"].save(
            make_auth_event(token_b, body={
                "result": "loss",
                "mistakes": 2,
                "training_decisions": [
                    {"id": "b1", "category": "hard_total", "scenarioKey": "ht_1",
                     "userAction": "stand", "optimalAction": "hit", "isCorrect": False},
                    {"id": "b2", "category": "pair_split", "scenarioKey": "ps_1",
                     "userAction": "hit", "optimalAction": "split", "isCorrect": False},
                ],
            }),
            ctx,
        )

        # Alice sees 100% accuracy
        resp = h["training"].get_summary(
            make_auth_event(token_a, query_params={"game_type": "blackjack"}), ctx
        )
        alice_summary = json.loads(resp["body"])
        assert alice_summary["total_decisions"] == 3
        assert alice_summary["correct_decisions"] == 3
        assert alice_summary["overall_accuracy"] == 1.0

        # Bob sees 0% accuracy
        resp = h["training"].get_summary(
            make_auth_event(token_b, query_params={"game_type": "blackjack"}), ctx
        )
        bob_summary = json.loads(resp["body"])
        assert bob_summary["total_decisions"] == 2
        assert bob_summary["correct_decisions"] == 0
        assert bob_summary["overall_accuracy"] == 0.0

    def test_users_cannot_see_each_other_profiles(self, dynamodb_tables, mock_context):
        """Each user's profile is isolated."""
        h, ctx = dynamodb_tables, mock_context

        token_a, _, _ = signup_and_login(h, ctx, "alice@example.com")
        token_b, _, _ = signup_and_login(h, ctx, "bob@example.com")

        # Alice saves details
        h["auth"].save_mandatory_details(
            make_auth_event(token_a, body={
                "first_name": "Alice",
                "last_name": "A",
                "dob": "01 / 01 / 1990",
                "country": "US",
            }),
            ctx,
        )

        # Bob saves details
        h["auth"].save_mandatory_details(
            make_auth_event(token_b, body={
                "first_name": "Bob",
                "last_name": "B",
                "dob": "02 / 02 / 1991",
                "country": "UK",
            }),
            ctx,
        )

        # Each sees their own
        resp_a = h["auth"].get_profile(make_auth_event(token_a), ctx)
        resp_b = h["auth"].get_profile(make_auth_event(token_b), ctx)

        assert json.loads(resp_a["body"])["first_name"] == "Alice"
        assert json.loads(resp_b["body"])["first_name"] == "Bob"


# ============================================================
# Flow 5: Error Handling & Edge Cases
# ============================================================


class TestErrorHandlingFlows:
    """Tests error handling across endpoint boundaries."""

    def test_expired_token_rejected_everywhere(self, dynamodb_tables, mock_context):
        """An expired JWT is rejected by all protected endpoints."""
        h, ctx = dynamodb_tables, mock_context

        # Create a token that's already expired
        from utils.auth import ALGORITHM
        expired_token = jwt.encode(
            {"sub": "fake-id", "email": "fake@example.com", "exp": 0},
            os.environ["SECRET_KEY"],
            algorithm=ALGORITHM,
        )

        event = make_auth_event(expired_token)

        assert h["auth"].get_mandatory_details(event, ctx)["statusCode"] == 401
        assert h["auth"].get_profile(event, ctx)["statusCode"] == 401
        assert h["training"].get_summary(
            {**event, "queryStringParameters": {"game_type": "blackjack"}}, ctx
        )["statusCode"] == 401
        assert h["training"].get_progress(
            {**event, "queryStringParameters": {"game_type": "blackjack"}}, ctx
        )["statusCode"] == 401

    def test_no_auth_header_rejected(self, dynamodb_tables, mock_context):
        """Requests without auth headers are rejected."""
        h, ctx = dynamodb_tables, mock_context
        event = {"headers": {}}

        assert h["auth"].get_mandatory_details(event, ctx)["statusCode"] == 401
        assert h["auth"].get_profile(event, ctx)["statusCode"] == 401

    def test_save_stats_validates_result_field(self, dynamodb_tables, mock_context):
        """Stats endpoint validates the result field."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, _ = signup_and_login(h, ctx, "validate@example.com")

        # Invalid result value
        resp = h["stats"].save(
            make_auth_event(token, body={"result": "invalid", "mistakes": 0}),
            ctx,
        )
        assert resp["statusCode"] == 400

        # Missing mistakes
        resp = h["stats"].save(
            make_auth_event(token, body={"result": "win", "mistakes": "not_int"}),
            ctx,
        )
        assert resp["statusCode"] == 400

        # Valid values work (includes training_session)
        for result in ["win", "loss", "push", "training_session"]:
            resp = h["stats"].save(
                make_auth_event(token, body={"result": result, "mistakes": 0}),
                ctx,
            )
            assert resp["statusCode"] == 200

    def test_signup_then_duplicate_then_login(self, dynamodb_tables, mock_context):
        """Duplicate signup fails but doesn't corrupt the original account."""
        h, ctx = dynamodb_tables, mock_context

        # First signup
        resp = signup_user(h, ctx, "dupe@example.com", "originalPass")
        assert resp["statusCode"] == 201

        # Duplicate signup
        resp = signup_user(h, ctx, "dupe@example.com", "differentPass")
        assert resp["statusCode"] == 400

        # Original password still works
        resp = login_user(h, ctx, "dupe@example.com", "originalPass")
        assert resp["statusCode"] == 200

        # The second password doesn't work
        resp = login_user(h, ctx, "dupe@example.com", "differentPass")
        assert resp["statusCode"] == 401


# ============================================================
# Flow 6: Extended Stats Fields
# ============================================================


class TestExtendedStatsFlow:
    """Tests optional/extended fields in the stats endpoint."""

    def test_save_stats_with_all_optional_fields(self, dynamodb_tables, mock_context):
        """Stats endpoint accepts all optional fields."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, _ = signup_and_login(h, ctx, "extended@example.com")

        resp = h["stats"].save(
            make_auth_event(token, body={
                "result": "win",
                "mistakes": 1,
                "net_payout": 150,
                "hands_played": 5,
                "details": {
                    "sessionId": "test-session",
                    "gameType": "blackjack",
                },
                "training_decisions": [
                    {"id": "d1", "category": "hard_total", "scenarioKey": "ht",
                     "userAction": "hit", "optimalAction": "hit", "isCorrect": True},
                ],
            }),
            ctx,
        )
        assert resp["statusCode"] == 200

        # Verify all fields stored
        table = boto3.resource("dynamodb").Table("TestStatsTable")
        items = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("userId").eq(uid)
        )["Items"]
        assert len(items) == 1
        item = items[0]
        assert item["net_payout"] == 150
        assert item["hands_played"] == 5
        assert item["details"]["sessionId"] == "test-session"
        assert len(item["training_decisions"]) == 1
