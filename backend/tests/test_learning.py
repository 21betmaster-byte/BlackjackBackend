"""End-to-end flow tests for the learning progress endpoints.

Tests complete user journeys through the learning system:
signup → login → save progress → get progress → complete → summary.
"""

import json

from tests.conftest import (
    signup_and_login,
    make_auth_event,
)


class TestLearningProgressFlow:
    """Tests the full learning journey from start to completion."""

    def test_user_starts_learning_saves_progress_and_resumes(
        self, dynamodb_tables, mock_context
    ):
        """User starts blackjack learning as beginner, saves progress, resumes later."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, email = signup_and_login(h, ctx, "learner@example.com")

        # Step 1: No progress exists yet
        resp = h["learning"].get_progress(
            make_auth_event(token, query_params={"game_type": "blackjack"}), ctx
        )
        assert resp["statusCode"] == 200
        assert json.loads(resp["body"]) is None

        # Step 2: Save initial progress (3 cards completed)
        resp = h["learning"].save_progress(
            make_auth_event(token, body={
                "game_type": "blackjack",
                "skill_level": "beginner",
                "completed_card_ids": ["bj_rule_goal", "bj_rule_card_values", "bj_rule_round"],
                "quiz_results": {},
                "completed": False,
            }),
            ctx,
        )
        assert resp["statusCode"] == 200
        assert json.loads(resp["body"])["status"] == "saved"

        # Step 3: Resume — progress is returned with 3 cards
        resp = h["learning"].get_progress(
            make_auth_event(token, query_params={"game_type": "blackjack"}), ctx
        )
        assert resp["statusCode"] == 200
        progress = json.loads(resp["body"])
        assert progress["game_type"] == "blackjack"
        assert progress["skill_level"] == "beginner"
        assert len(progress["completed_card_ids"]) == 3
        assert progress["completed"] is False
        assert progress["started_at"] is not None

        # Step 4: Update progress (more cards + quiz result)
        resp = h["learning"].save_progress(
            make_auth_event(token, body={
                "game_type": "blackjack",
                "skill_level": "beginner",
                "completed_card_ids": [
                    "bj_rule_goal", "bj_rule_card_values", "bj_rule_round",
                    "bj_rule_hit_stand", "bj_quiz_total",
                ],
                "quiz_results": {
                    "bj_quiz_total": {"correct": True, "answeredAt": 1700000000},
                },
                "completed": False,
            }),
            ctx,
        )
        assert resp["statusCode"] == 200

        # Step 5: Verify updated progress preserves startedAt
        resp = h["learning"].get_progress(
            make_auth_event(token, query_params={"game_type": "blackjack"}), ctx
        )
        progress = json.loads(resp["body"])
        assert len(progress["completed_card_ids"]) == 5
        assert progress["quiz_results"]["bj_quiz_total"]["correct"] is True
        assert progress["started_at"] is not None  # preserved from step 2

    def test_user_completes_learning_and_sees_completion_stats(
        self, dynamodb_tables, mock_context
    ):
        """User completes all cards and the completion is reflected."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, email = signup_and_login(h, ctx, "completer@example.com")

        # Complete the learning
        resp = h["learning"].save_progress(
            make_auth_event(token, body={
                "game_type": "blackjack",
                "skill_level": "amateur",
                "completed_card_ids": [f"card_{i}" for i in range(20)],
                "quiz_results": {
                    "card_15": {"correct": True, "answeredAt": 1700000000},
                    "card_18": {"correct": False, "answeredAt": 1700000001},
                },
                "completed": True,
            }),
            ctx,
        )
        assert resp["statusCode"] == 200

        # Get progress — completed with completedAt
        resp = h["learning"].get_progress(
            make_auth_event(token, query_params={"game_type": "blackjack"}), ctx
        )
        progress = json.loads(resp["body"])
        assert progress["completed"] is True
        assert progress["completed_at"] is not None
        assert progress["skill_level"] == "amateur"

    def test_learning_summary_shows_all_games(
        self, dynamodb_tables, mock_context
    ):
        """Summary endpoint aggregates progress across multiple games."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, email = signup_and_login(h, ctx, "multi@example.com")

        # Save blackjack progress (completed)
        h["learning"].save_progress(
            make_auth_event(token, body={
                "game_type": "blackjack",
                "skill_level": "beginner",
                "completed_card_ids": [f"bj_{i}" for i in range(22)],
                "quiz_results": {"bj_q1": {"correct": True, "answeredAt": 1700000000}},
                "completed": True,
            }),
            ctx,
        )

        # Save poker progress (in progress)
        h["learning"].save_progress(
            make_auth_event(token, body={
                "game_type": "texas_holdem",
                "skill_level": "pro",
                "completed_card_ids": ["th_1", "th_2", "th_3"],
                "quiz_results": {},
                "completed": False,
            }),
            ctx,
        )

        # Get summary
        resp = h["learning"].get_summary(
            make_auth_event(token), ctx
        )
        assert resp["statusCode"] == 200
        summary = json.loads(resp["body"])
        assert summary["total_games_started"] == 2
        assert summary["total_games_completed"] == 1

        games = {g["game_type"]: g for g in summary["games"]}
        assert games["blackjack"]["completed"] is True
        assert games["blackjack"]["cards_completed"] == 22
        assert games["blackjack"]["quiz_score"]["correct"] == 1
        assert games["texas_holdem"]["completed"] is False
        assert games["texas_holdem"]["cards_completed"] == 3


class TestLearningValidation:
    """Tests validation and error handling for learning endpoints."""

    def test_save_progress_requires_auth(self, dynamodb_tables, mock_context):
        """Saving progress without auth returns 401."""
        h, ctx = dynamodb_tables, mock_context
        resp = h["learning"].save_progress(
            {"headers": {}, "body": json.dumps({"game_type": "blackjack"})}, ctx
        )
        assert resp["statusCode"] == 401

    def test_save_progress_validates_skill_level(self, dynamodb_tables, mock_context):
        """Invalid skill level returns 400."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, email = signup_and_login(h, ctx, "validator@example.com")

        resp = h["learning"].save_progress(
            make_auth_event(token, body={
                "game_type": "blackjack",
                "skill_level": "legendary",
                "completed_card_ids": [],
            }),
            ctx,
        )
        assert resp["statusCode"] == 400
        assert "skill_level" in json.loads(resp["body"])["detail"]

    def test_save_progress_validates_game_type(self, dynamodb_tables, mock_context):
        """Missing game_type returns 400."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, email = signup_and_login(h, ctx, "notype@example.com")

        resp = h["learning"].save_progress(
            make_auth_event(token, body={
                "skill_level": "beginner",
                "completed_card_ids": [],
            }),
            ctx,
        )
        assert resp["statusCode"] == 400

    def test_get_progress_requires_game_type(self, dynamodb_tables, mock_context):
        """GET without game_type query param returns 400."""
        h, ctx = dynamodb_tables, mock_context
        token, uid, email = signup_and_login(h, ctx, "noquery@example.com")

        resp = h["learning"].get_progress(
            make_auth_event(token), ctx
        )
        assert resp["statusCode"] == 400


class TestLearningMultiUserIsolation:
    """Tests that users cannot see each other's learning progress."""

    def test_users_only_see_own_progress(self, dynamodb_tables, mock_context):
        """Two users save progress and each only sees their own."""
        h, ctx = dynamodb_tables, mock_context

        token_a, _, _ = signup_and_login(h, ctx, "alice@example.com")
        token_b, _, _ = signup_and_login(h, ctx, "bob@example.com")

        # Alice: beginner, 5 cards
        h["learning"].save_progress(
            make_auth_event(token_a, body={
                "game_type": "blackjack",
                "skill_level": "beginner",
                "completed_card_ids": [f"a_{i}" for i in range(5)],
                "completed": False,
            }),
            ctx,
        )

        # Bob: pro, 3 cards
        h["learning"].save_progress(
            make_auth_event(token_b, body={
                "game_type": "blackjack",
                "skill_level": "pro",
                "completed_card_ids": [f"b_{i}" for i in range(3)],
                "completed": True,
            }),
            ctx,
        )

        # Alice sees her progress
        resp = h["learning"].get_progress(
            make_auth_event(token_a, query_params={"game_type": "blackjack"}), ctx
        )
        progress = json.loads(resp["body"])
        assert progress["skill_level"] == "beginner"
        assert len(progress["completed_card_ids"]) == 5
        assert progress["completed"] is False

        # Bob sees his progress
        resp = h["learning"].get_progress(
            make_auth_event(token_b, query_params={"game_type": "blackjack"}), ctx
        )
        progress = json.loads(resp["body"])
        assert progress["skill_level"] == "pro"
        assert len(progress["completed_card_ids"]) == 3
        assert progress["completed"] is True

        # Alice's summary only shows her games
        resp = h["learning"].get_summary(
            make_auth_event(token_a), ctx
        )
        summary = json.loads(resp["body"])
        assert summary["total_games_started"] == 1
        assert summary["total_games_completed"] == 0
