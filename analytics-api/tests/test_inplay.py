import numpy as np

from app.models.inplay import calculate_live_win_probability


def test_inplay_at_kickoff():
    res = calculate_live_win_probability(
        minute=0,
        current_home_goals=0,
        current_away_goals=0,
        home_xg=0.0,
        away_xg=0.0,
        prematch_lambda_home=1.5,
        prematch_lambda_away=1.0,
    )
    # 1. Probabilities sum to 1.0
    total = res["home"] + res["draw"] + res["away"]
    assert np.isclose(total, 1.0, atol=1e-3)

    # 2. Stronger home team is favoured at 0'
    assert res["home"] > res["away"]
    assert res["home"] > res["draw"]


def test_inplay_at_full_time_home_leading():
    res = calculate_live_win_probability(
        minute=90,
        current_home_goals=1,
        current_away_goals=0,
        home_xg=1.2,
        away_xg=0.4,
        added_time=0,
    )
    # Step 17 requirement: at 90' with home 1-0 up, home win > 0.99
    assert res["home"] > 0.99
    assert res["away"] == 0.0
    assert res["draw"] < 0.01


def test_inplay_red_card_penalty():
    base_res = calculate_live_win_probability(
        minute=30,
        current_home_goals=0,
        current_away_goals=0,
        home_xg=0.5,
        away_xg=0.4,
        home_red_cards=0,
    )
    red_res = calculate_live_win_probability(
        minute=30,
        current_home_goals=0,
        current_away_goals=0,
        home_xg=0.5,
        away_xg=0.4,
        home_red_cards=1,
    )
    # Home team win prob drops when home gets a red card
    assert red_res["home"] < base_res["home"]
    assert red_res["away"] > base_res["away"]
