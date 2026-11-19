import numpy as np
import pytest

from app.models.dixon_coles import DixonColesModel


@pytest.fixture
def sample_league_matches():
    # Synthetic round-robin matches
    # Team 1 is strong (scores high, concedes low)
    # Team 2 is average
    # Team 3 is weak
    matches = [
        # Team 1 vs Team 2
        {
            "home_id": "1",
            "away_id": "2",
            "home_name": "City",
            "away_name": "United",
            "home_goals": 3,
            "away_goals": 1,
            "date": "2024-09-01T15:00:00Z",
        },
        {
            "home_id": "2",
            "away_id": "1",
            "home_name": "United",
            "away_name": "City",
            "home_goals": 1,
            "away_goals": 2,
            "date": "2024-09-08T15:00:00Z",
        },
        # Team 1 vs Team 3
        {
            "home_id": "1",
            "away_id": "3",
            "home_name": "City",
            "away_name": "Rovers",
            "home_goals": 4,
            "away_goals": 0,
            "date": "2024-09-15T15:00:00Z",
        },
        {
            "home_id": "3",
            "away_id": "1",
            "home_name": "Rovers",
            "away_name": "City",
            "home_goals": 0,
            "away_goals": 3,
            "date": "2024-09-22T15:00:00Z",
        },
        # Team 2 vs Team 3
        {
            "home_id": "2",
            "away_id": "3",
            "home_name": "United",
            "away_name": "Rovers",
            "home_goals": 2,
            "away_goals": 0,
            "date": "2024-09-29T15:00:00Z",
        },
        {
            "home_id": "3",
            "away_id": "2",
            "home_name": "Rovers",
            "away_name": "United",
            "home_goals": 1,
            "away_goals": 1,
            "date": "2024-10-06T15:00:00Z",
        },
        # Additional matches for stability
        {
            "home_id": "1",
            "away_id": "2",
            "home_name": "City",
            "away_name": "United",
            "home_goals": 2,
            "away_goals": 0,
            "date": "2024-10-13T15:00:00Z",
        },
        {
            "home_id": "2",
            "away_id": "3",
            "home_name": "United",
            "away_name": "Rovers",
            "home_goals": 3,
            "away_goals": 1,
            "date": "2024-10-20T15:00:00Z",
        },
        {
            "home_id": "3",
            "away_id": "1",
            "home_name": "Rovers",
            "away_name": "City",
            "home_goals": 0,
            "away_goals": 2,
            "date": "2024-10-27T15:00:00Z",
        },
    ]
    return matches


def test_dixon_coles_fitting(sample_league_matches):
    model = DixonColesModel(league="test_league")
    model.fit(sample_league_matches)

    # 1. Check home advantage > 0
    assert model.home_adv > 0, f"Expected positive home advantage, got {model.home_adv}"

    # 2. Check sum of attack ratings is zero (identifiability constraint)
    assert np.isclose(np.sum(model.attack), 0.0, atol=1e-4)

    # 3. Team 1 (City) should have higher attack rating than Team 3 (Rovers)
    idx_1 = model.team_indices["1"]
    idx_3 = model.team_indices["3"]
    assert model.attack[idx_1] > model.attack[idx_3], "Strong team should have higher attack rating"


def test_dixon_coles_prediction_probabilities(sample_league_matches):
    model = DixonColesModel(league="test_league")
    model.fit(sample_league_matches)

    pred = model.predict_match(home_id="1", away_id="3")

    # 1. Expected goals: strong home team > weak away team
    assert pred["expected_goals"]["home"] > pred["expected_goals"]["away"]

    # 2. Probabilities sum to 1.0 (approx)
    prob_sum = (
        pred["win_probability"]["home"]
        + pred["win_probability"]["draw"]
        + pred["win_probability"]["away"]
    )
    assert np.isclose(prob_sum, 1.0, atol=1e-3)

    # 3. Strong home team is favourite
    assert pred["win_probability"]["home"] > pred["win_probability"]["away"]

    # 4. Score grid sums to 1.0
    grid_sum = sum(sum(row) for row in pred["score_grid"])
    assert np.isclose(grid_sum, 1.0, atol=1e-3)

    # 5. Top 5 scores
    assert len(pred["top_scores"]) == 5
    assert pred["top_scores"][0]["prob"] >= pred["top_scores"][1]["prob"]

    # 6. Over 2.5 and BTTS bounds
    assert 0.0 <= pred["over_25"] <= 1.0
    assert 0.0 <= pred["btts"] <= 1.0
