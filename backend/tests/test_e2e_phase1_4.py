"""E2E tests for Phase 1-4 features.

Tests the new features added in Phases 1-4:
- Phase 1: Stats.py Bearer token auth, training_session result type
- Phase 2: Stats dashboard data pipeline (summary + progress)
- Phase 3: Training analytics with surrender decisions, multi-category analysis
- Phase 4: Surrender action tracking through the full pipeline
"""

import json
import os
import boto3
from jose import jwt

from tests.conftest import (
    signup_user,
    login_user,
    signup_and_login,
    make_auth_event,
)


# ============================================================
# Phase 1: Bearer Token Auth & training_session Result Type
# ============================================================


class TestBearerTokenAuth:
    """Tests that stats.py correctly uses Bearer token auth (not API Gateway authorizer)."""

    def test_stats_save_with_bearer_token(self, dynamodb_tables, mock_context):
        """Stats save accepts Bearer token in Authorization header."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, _ = signup_and_login(h, ctx, "bearer@example.com")

        resp = h["stats"].save(
            make_auth_event(token, body={"result": "win", "mistakes": 0}),
            ctx,
        )
        assert resp["statusCode"] == 200

        # Verify stored with correct userId
        table = boto3.resource("dynamodb").Table("TestStatsTable")
        items = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("userId").eq(uid)
        )["Items"]
        assert len(items) == 1
        assert items[0]["userId"] == uid

    def test_stats_save_with_lowercase_authorization_header(self, dynamodb_tables, mock_context):
        """Stats save handles lowercase 'authorization' header (some API gateways normalize)."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, _ = signup_and_login(h, ctx, "lowercase@example.com")

        event = {
            "headers": {"authorization": f"Bearer {token}"},
            "body": json.dumps({"result": "loss", "mistakes": 1}),
        }
        resp = h["stats"].save(event, ctx)
        assert resp["statusCode"] == 200

    def test_stats_save_rejects_missing_bearer_prefix(self, dynamodb_tables, mock_context):
        """Token without 'Bearer ' prefix is rejected."""
        h, ctx = dynamodb_tables, mock_context
        token, _, _ = signup_and_login(h, ctx, "noprefix@example.com")

        event = {
            "headers": {"Authorization": token},  # missing "Bearer " prefix
            "body": json.dumps({"result": "win", "mistakes": 0}),
        }
        resp = h["stats"].save(event, ctx)
        assert resp["statusCode"] == 401

    def test_stats_save_rejects_invalid_token(self, dynamodb_tables, mock_context):
        """Invalid JWT token is rejected."""
        h, ctx = dynamodb_tables, mock_context

        event = {
            "headers": {"Authorization": "Bearer invalid-jwt-token"},
            "body": json.dumps({"result": "win", "mistakes": 0}),
        }
        resp = h["stats"].save(event, ctx)
        assert resp["statusCode"] == 401

    def test_training_session_is_valid_result_type(self, dynamodb_tables, mock_context):
        """'training_session' is accepted as a valid result type."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, _ = signup_and_login(h, ctx, "tsession@example.com")

        resp = h["stats"].save(
            make_auth_event(token, body={
                "result": "training_session",
                "mistakes": 3,
                "training_decisions": [
                    {"id": "d1", "category": "hard_total", "scenarioKey": "ht_16v10",
                     "userAction": "surrender", "optimalAction": "surrender", "isCorrect": True},
                ],
            }),
            ctx,
        )
        assert resp["statusCode"] == 200

        # Verify stored
        table = boto3.resource("dynamodb").Table("TestStatsTable")
        items = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("userId").eq(uid)
        )["Items"]
        assert len(items) == 1
        assert items[0]["result"] == "training_session"
        assert len(items[0]["training_decisions"]) == 1


# ============================================================
# Phase 2: Stats Dashboard Data Pipeline
# ============================================================


class TestStatsDashboardPipeline:
    """Tests the full data flow from stats save → training summary/progress for the stats dashboard."""

    def test_dashboard_shows_category_breakdown(self, dynamodb_tables, mock_context):
        """Stats dashboard receives correct category-level accuracy data."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, _ = signup_and_login(h, ctx, "dashboard@example.com")

        decisions = [
            # hard_total: 4/5 = 80%
            {"id": "d1", "category": "hard_total", "scenarioKey": "ht1",
             "userAction": "hit", "optimalAction": "hit", "isCorrect": True},
            {"id": "d2", "category": "hard_total", "scenarioKey": "ht2",
             "userAction": "stand", "optimalAction": "stand", "isCorrect": True},
            {"id": "d3", "category": "hard_total", "scenarioKey": "ht3",
             "userAction": "hit", "optimalAction": "hit", "isCorrect": True},
            {"id": "d4", "category": "hard_total", "scenarioKey": "ht4",
             "userAction": "surrender", "optimalAction": "surrender", "isCorrect": True},
            {"id": "d5", "category": "hard_total", "scenarioKey": "ht5",
             "userAction": "hit", "optimalAction": "stand", "isCorrect": False},
            # soft_total: 1/3 = 33%
            {"id": "d6", "category": "soft_total", "scenarioKey": "st1",
             "userAction": "hit", "optimalAction": "double", "isCorrect": False},
            {"id": "d7", "category": "soft_total", "scenarioKey": "st2",
             "userAction": "stand", "optimalAction": "hit", "isCorrect": False},
            {"id": "d8", "category": "soft_total", "scenarioKey": "st3",
             "userAction": "hit", "optimalAction": "hit", "isCorrect": True},
            # pair_split: 2/2 = 100%
            {"id": "d9", "category": "pair_split", "scenarioKey": "ps1",
             "userAction": "split", "optimalAction": "split", "isCorrect": True},
            {"id": "d10", "category": "pair_split", "scenarioKey": "ps2",
             "userAction": "split", "optimalAction": "split", "isCorrect": True},
        ]

        h["stats"].save(
            make_auth_event(token, body={
                "result": "training_session",
                "mistakes": 3,
                "training_decisions": decisions,
            }),
            ctx,
        )

        resp = h["training"].get_summary(
            make_auth_event(token, query_params={"game_type": "blackjack"}),
            ctx,
        )
        assert resp["statusCode"] == 200
        summary = json.loads(resp["body"])

        assert summary["total_decisions"] == 10
        assert summary["correct_decisions"] == 7
        assert abs(summary["overall_accuracy"] - 0.7) < 0.01

        cats = {c["category"]: c for c in summary["category_stats"]}
        assert cats["hard_total"]["total"] == 5
        assert cats["hard_total"]["correct"] == 4
        assert cats["soft_total"]["total"] == 3
        assert cats["soft_total"]["correct"] == 1
        assert cats["pair_split"]["total"] == 2
        assert cats["pair_split"]["correct"] == 2

        # Weakest categories sorted by accuracy (ascending)
        # soft_total (33%) < hard_total (80%) < pair_split (100%)
        assert summary["weakest_categories"][0] == "soft_total"

    def test_dashboard_accuracy_trend_across_sessions(self, dynamodb_tables, mock_context):
        """Stats dashboard shows accuracy improvement across multiple sessions."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, _ = signup_and_login(h, ctx, "trend@example.com")

        # Session 1: 40% accuracy
        h["stats"].save(
            make_auth_event(token, body={
                "result": "training_session",
                "mistakes": 3,
                "training_decisions": [
                    {"id": "s1d1", "category": "hard_total", "scenarioKey": "ht",
                     "userAction": "hit", "optimalAction": "hit", "isCorrect": True},
                    {"id": "s1d2", "category": "hard_total", "scenarioKey": "ht",
                     "userAction": "stand", "optimalAction": "hit", "isCorrect": False},
                    {"id": "s1d3", "category": "hard_total", "scenarioKey": "ht",
                     "userAction": "hit", "optimalAction": "hit", "isCorrect": True},
                    {"id": "s1d4", "category": "soft_total", "scenarioKey": "st",
                     "userAction": "stand", "optimalAction": "hit", "isCorrect": False},
                    {"id": "s1d5", "category": "soft_total", "scenarioKey": "st",
                     "userAction": "stand", "optimalAction": "double", "isCorrect": False},
                ],
            }),
            ctx,
        )

        # Session 2: 80% accuracy
        h["stats"].save(
            make_auth_event(token, body={
                "result": "training_session",
                "mistakes": 1,
                "training_decisions": [
                    {"id": "s2d1", "category": "hard_total", "scenarioKey": "ht",
                     "userAction": "hit", "optimalAction": "hit", "isCorrect": True},
                    {"id": "s2d2", "category": "hard_total", "scenarioKey": "ht",
                     "userAction": "surrender", "optimalAction": "surrender", "isCorrect": True},
                    {"id": "s2d3", "category": "soft_total", "scenarioKey": "st",
                     "userAction": "double", "optimalAction": "double", "isCorrect": True},
                    {"id": "s2d4", "category": "pair_split", "scenarioKey": "ps",
                     "userAction": "split", "optimalAction": "split", "isCorrect": True},
                    {"id": "s2d5", "category": "pair_split", "scenarioKey": "ps",
                     "userAction": "hit", "optimalAction": "split", "isCorrect": False},
                ],
            }),
            ctx,
        )

        # Session 3: 100% accuracy
        h["stats"].save(
            make_auth_event(token, body={
                "result": "training_session",
                "mistakes": 0,
                "training_decisions": [
                    {"id": "s3d1", "category": "hard_total", "scenarioKey": "ht",
                     "userAction": "stand", "optimalAction": "stand", "isCorrect": True},
                    {"id": "s3d2", "category": "hard_total", "scenarioKey": "ht",
                     "userAction": "surrender", "optimalAction": "surrender", "isCorrect": True},
                    {"id": "s3d3", "category": "soft_total", "scenarioKey": "st",
                     "userAction": "hit", "optimalAction": "hit", "isCorrect": True},
                ],
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
        assert snapshots[0]["overall_accuracy"] == 0.4
        assert snapshots[1]["overall_accuracy"] == 0.8
        assert snapshots[2]["overall_accuracy"] == 1.0

        # Verify cumulative summary
        resp = h["training"].get_summary(
            make_auth_event(token, query_params={"game_type": "blackjack"}),
            ctx,
        )
        summary = json.loads(resp["body"])
        assert summary["total_decisions"] == 13
        assert summary["correct_decisions"] == 9


# ============================================================
# Phase 3: Training Analytics with Surrender Decisions
# ============================================================


class TestSurrenderTrainingAnalytics:
    """Tests surrender decisions flow through the training analytics pipeline."""

    def test_surrender_decisions_tracked_in_summary(self, dynamodb_tables, mock_context):
        """Surrender action is properly tracked in training summary."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, _ = signup_and_login(h, ctx, "surrender@example.com")

        decisions = [
            {"id": "d1", "category": "hard_total", "scenarioKey": "h16v10",
             "userAction": "surrender", "optimalAction": "surrender", "isCorrect": True},
            {"id": "d2", "category": "hard_total", "scenarioKey": "h16v9",
             "userAction": "surrender", "optimalAction": "surrender", "isCorrect": True},
            {"id": "d3", "category": "hard_total", "scenarioKey": "h15vA",
             "userAction": "surrender", "optimalAction": "surrender", "isCorrect": True},
            {"id": "d4", "category": "hard_total", "scenarioKey": "h15v10",
             "userAction": "hit", "optimalAction": "surrender", "isCorrect": False},
            {"id": "d5", "category": "hard_total", "scenarioKey": "h16vA",
             "userAction": "stand", "optimalAction": "surrender", "isCorrect": False},
        ]

        h["stats"].save(
            make_auth_event(token, body={
                "result": "training_session",
                "mistakes": 2,
                "training_decisions": decisions,
            }),
            ctx,
        )

        resp = h["training"].get_summary(
            make_auth_event(token, query_params={"game_type": "blackjack"}),
            ctx,
        )
        summary = json.loads(resp["body"])

        assert summary["total_decisions"] == 5
        assert summary["correct_decisions"] == 3
        assert abs(summary["overall_accuracy"] - 0.6) < 0.01

    def test_surrender_mixed_with_other_categories(self, dynamodb_tables, mock_context):
        """Surrender decisions in hard_total don't interfere with other categories."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, _ = signup_and_login(h, ctx, "mixsurr@example.com")

        decisions = [
            # Surrender decisions (hard_total)
            {"id": "d1", "category": "hard_total", "scenarioKey": "h16v10",
             "userAction": "surrender", "optimalAction": "surrender", "isCorrect": True},
            # Non-surrender hard_total
            {"id": "d2", "category": "hard_total", "scenarioKey": "h12v4",
             "userAction": "stand", "optimalAction": "stand", "isCorrect": True},
            # Soft total
            {"id": "d3", "category": "soft_total", "scenarioKey": "s17v6",
             "userAction": "double", "optimalAction": "double", "isCorrect": True},
            # Pair split
            {"id": "d4", "category": "pair_split", "scenarioKey": "p8v6",
             "userAction": "split", "optimalAction": "split", "isCorrect": True},
            # Insurance
            {"id": "d5", "category": "insurance", "scenarioKey": "ins_vA",
             "userAction": "no_insurance", "optimalAction": "no_insurance", "isCorrect": True},
        ]

        h["stats"].save(
            make_auth_event(token, body={
                "result": "training_session",
                "mistakes": 0,
                "training_decisions": decisions,
            }),
            ctx,
        )

        resp = h["training"].get_summary(
            make_auth_event(token, query_params={"game_type": "blackjack"}),
            ctx,
        )
        summary = json.loads(resp["body"])

        assert summary["total_decisions"] == 5
        assert summary["correct_decisions"] == 5
        assert summary["overall_accuracy"] == 1.0

        cats = {c["category"]: c for c in summary["category_stats"]}
        assert len(cats) == 4
        assert cats["hard_total"]["total"] == 2
        assert cats["soft_total"]["total"] == 1
        assert cats["pair_split"]["total"] == 1
        assert cats["insurance"]["total"] == 1


# ============================================================
# Phase 4: Full Pipeline — Auth → Play → Surrender → Analytics
# ============================================================


class TestFullSurrenderPipeline:
    """Full E2E: signup → login → save training with surrender → view analytics."""

    def test_complete_surrender_training_journey(self, dynamodb_tables, mock_context):
        """Complete user journey with surrender decisions through analytics."""
        h, ctx = dynamodb_tables, mock_context

        # Step 1: Signup + login
        token, uid, email = signup_and_login(h, ctx, "fulljourney@example.com")

        # Step 2: Session 1 — learning surrender (2/4 correct)
        h["stats"].save(
            make_auth_event(token, body={
                "result": "training_session",
                "mistakes": 2,
                "training_decisions": [
                    {"id": "s1d1", "category": "hard_total", "scenarioKey": "h16v10",
                     "userAction": "surrender", "optimalAction": "surrender", "isCorrect": True},
                    {"id": "s1d2", "category": "hard_total", "scenarioKey": "h16vA",
                     "userAction": "hit", "optimalAction": "surrender", "isCorrect": False},
                    {"id": "s1d3", "category": "hard_total", "scenarioKey": "h15v10",
                     "userAction": "stand", "optimalAction": "surrender", "isCorrect": False},
                    {"id": "s1d4", "category": "soft_total", "scenarioKey": "s17v6",
                     "userAction": "double", "optimalAction": "double", "isCorrect": True},
                ],
            }),
            ctx,
        )

        # Step 3: Session 2 — mastering surrender (4/4 correct)
        h["stats"].save(
            make_auth_event(token, body={
                "result": "training_session",
                "mistakes": 0,
                "training_decisions": [
                    {"id": "s2d1", "category": "hard_total", "scenarioKey": "h16v10",
                     "userAction": "surrender", "optimalAction": "surrender", "isCorrect": True},
                    {"id": "s2d2", "category": "hard_total", "scenarioKey": "h16vA",
                     "userAction": "surrender", "optimalAction": "surrender", "isCorrect": True},
                    {"id": "s2d3", "category": "hard_total", "scenarioKey": "h15v10",
                     "userAction": "surrender", "optimalAction": "surrender", "isCorrect": True},
                    {"id": "s2d4", "category": "hard_total", "scenarioKey": "h15vA",
                     "userAction": "surrender", "optimalAction": "surrender", "isCorrect": True},
                ],
            }),
            ctx,
        )

        # Step 4: Verify progress shows improvement
        resp = h["training"].get_progress(
            make_auth_event(token, query_params={"game_type": "blackjack"}),
            ctx,
        )
        progress = json.loads(resp["body"])
        assert len(progress["snapshots"]) == 2
        assert progress["snapshots"][0]["overall_accuracy"] == 0.5
        assert progress["snapshots"][1]["overall_accuracy"] == 1.0

        # Step 5: Verify cumulative summary
        resp = h["training"].get_summary(
            make_auth_event(token, query_params={"game_type": "blackjack"}),
            ctx,
        )
        summary = json.loads(resp["body"])
        assert summary["total_decisions"] == 8
        assert summary["correct_decisions"] == 6
        assert abs(summary["overall_accuracy"] - 0.75) < 0.01

        # hard_total: 5/7, soft_total: 1/1
        cats = {c["category"]: c for c in summary["category_stats"]}
        assert cats["hard_total"]["total"] == 7
        assert cats["hard_total"]["correct"] == 5
        assert cats["soft_total"]["total"] == 1
        assert cats["soft_total"]["correct"] == 1

    def test_surrender_with_profile_and_stats_isolation(self, dynamodb_tables, mock_context):
        """Surrender training data is properly isolated per user."""
        h, ctx = dynamodb_tables, mock_context

        token_a, _, _ = signup_and_login(h, ctx, "surr_alice@example.com")
        token_b, _, _ = signup_and_login(h, ctx, "surr_bob@example.com")

        # Alice: all correct surrenders
        h["stats"].save(
            make_auth_event(token_a, body={
                "result": "training_session",
                "mistakes": 0,
                "training_decisions": [
                    {"id": "a1", "category": "hard_total", "scenarioKey": "h16v10",
                     "userAction": "surrender", "optimalAction": "surrender", "isCorrect": True},
                    {"id": "a2", "category": "hard_total", "scenarioKey": "h16v9",
                     "userAction": "surrender", "optimalAction": "surrender", "isCorrect": True},
                ],
            }),
            ctx,
        )

        # Bob: all wrong (should surrender but doesn't)
        h["stats"].save(
            make_auth_event(token_b, body={
                "result": "training_session",
                "mistakes": 3,
                "training_decisions": [
                    {"id": "b1", "category": "hard_total", "scenarioKey": "h16v10",
                     "userAction": "hit", "optimalAction": "surrender", "isCorrect": False},
                    {"id": "b2", "category": "hard_total", "scenarioKey": "h16v9",
                     "userAction": "stand", "optimalAction": "surrender", "isCorrect": False},
                    {"id": "b3", "category": "hard_total", "scenarioKey": "h15vA",
                     "userAction": "hit", "optimalAction": "surrender", "isCorrect": False},
                ],
            }),
            ctx,
        )

        # Alice: 100%
        resp_a = h["training"].get_summary(
            make_auth_event(token_a, query_params={"game_type": "blackjack"}), ctx
        )
        assert json.loads(resp_a["body"])["overall_accuracy"] == 1.0
        assert json.loads(resp_a["body"])["total_decisions"] == 2

        # Bob: 0%
        resp_b = h["training"].get_summary(
            make_auth_event(token_b, query_params={"game_type": "blackjack"}), ctx
        )
        assert json.loads(resp_b["body"])["overall_accuracy"] == 0.0
        assert json.loads(resp_b["body"])["total_decisions"] == 3
