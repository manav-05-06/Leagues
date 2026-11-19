import math
from typing import Any

import numpy as np
from scipy.stats import poisson


def calculate_live_win_probability(
    minute: int,
    current_home_goals: int,
    current_away_goals: int,
    home_xg: float,
    away_xg: float,
    home_red_cards: int = 0,
    away_red_cards: int = 0,
    prematch_lambda_home: float = 1.35,
    prematch_lambda_away: float = 1.10,
    added_time: int = 0,
    max_eval_goals: int = 8,
) -> dict[str, Any]:
    """
    In-play Poisson model blending pre-match expected goals with live xG rate,
    scaled by remaining time and adjusted for red cards.
    """
    total_match_mins = 90.0 + added_time

    # Finished match
    if minute >= total_match_mins:
        if current_home_goals > current_away_goals:
            hw, dr, aw = 1.0, 0.0, 0.0
        elif current_home_goals == current_away_goals:
            hw, dr, aw = 0.0, 1.0, 0.0
        else:
            hw, dr, aw = 0.0, 0.0, 1.0

        return {
            "minute": minute,
            "home": hw,
            "draw": dr,
            "away": aw,
            "next_goal": {"home": 0.0, "away": 0.0, "none": 1.0},
            "rem_lambda": {"home": 0.0, "away": 0.0},
        }

    # Time remaining ratio
    r = max(0.0, (total_match_mins - minute) / 90.0)

    # Weight shift towards live data as match progresses (up to 0.60)
    w = min(0.60, minute / 90.0)

    # Extrapolated live xG rate per 90
    rate_h_live = (home_xg / max(minute, 1)) * 90.0
    rate_a_live = (away_xg / max(minute, 1)) * 90.0

    # Remaining goal expectancies
    rem_h = r * ((1.0 - w) * prematch_lambda_home + w * rate_h_live)
    rem_a = r * ((1.0 - w) * prematch_lambda_away + w * rate_a_live)

    # Red card adjustments
    if home_red_cards > 0:
        rem_h *= 0.75**home_red_cards
        rem_a *= 1.15**home_red_cards
    if away_red_cards > 0:
        rem_a *= 0.75**away_red_cards
        rem_h *= 1.15**away_red_cards

    # Numerical safeguard
    rem_h = max(0.0001, rem_h)
    rem_a = max(0.0001, rem_a)

    # Evaluate possible remaining goals distribution
    grid = np.zeros((max_eval_goals + 1, max_eval_goals + 1))
    for kh in range(max_eval_goals + 1):
        for ka in range(max_eval_goals + 1):
            grid[kh, ka] = poisson.pmf(kh, rem_h) * poisson.pmf(ka, rem_a)

    total_p = np.sum(grid)
    if total_p > 0:
        grid /= total_p

    # Aggregate final outcomes (current goals + remaining goals)
    hw = 0.0
    dr = 0.0
    aw = 0.0

    for kh in range(max_eval_goals + 1):
        for ka in range(max_eval_goals + 1):
            final_h = current_home_goals + kh
            final_a = current_away_goals + ka
            p = grid[kh, ka]
            if final_h > final_a:
                hw += p
            elif final_h == final_a:
                dr += p
            else:
                aw += p

    # Next goal probabilities
    total_rem = rem_h + rem_a
    p_none = math.exp(-total_rem)
    if total_rem > 0:
        p_next_h = (1.0 - p_none) * (rem_h / total_rem)
        p_next_a = (1.0 - p_none) * (rem_a / total_rem)
    else:
        p_next_h, p_next_a = 0.0, 0.0

    return {
        "minute": minute,
        "home": round(hw, 4),
        "draw": round(dr, 4),
        "away": round(aw, 4),
        "next_goal": {
            "home": round(p_next_h, 4),
            "away": round(p_next_a, 4),
            "none": round(p_none, 4),
        },
        "rem_lambda": {
            "home": round(rem_h, 3),
            "away": round(rem_a, 3),
        },
    }


def build_win_probability_history(
    shots: list[Any],
    events: list[Any],
    home_team_id: str,
    away_team_id: str,
    max_minute: int = 90,
    prematch_lambda_home: float = 1.35,
    prematch_lambda_away: float = 1.10,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """
    Rebuild minute-by-minute win probability trajectory from kickoff to max_minute.
    """
    # Sort events chronologically
    sorted_shots = sorted(shots, key=lambda s: getattr(s, "minute", 0))

    history: list[dict[str, Any]] = []
    end_minute = max(max_minute, 90)

    # Sample minutes (every minute or key milestone minutes)
    for m in range(end_minute + 1):
        # Accumulate score, xg, and red cards up to minute m
        shots_up_to_m = [s for s in sorted_shots if getattr(s, "minute", 0) <= m]
        h_shots = [s for s in shots_up_to_m if str(getattr(s, "team_id", "")) == home_team_id]
        a_shots = [s for s in shots_up_to_m if str(getattr(s, "team_id", "")) == away_team_id]

        h_goals = sum(1 for s in h_shots if getattr(s, "outcome", "") == "goal")
        a_goals = sum(1 for s in a_shots if getattr(s, "outcome", "") == "goal")

        h_xg = sum(float(getattr(s, "xg", 0.0)) for s in h_shots)
        a_xg = sum(float(getattr(s, "xg", 0.0)) for s in a_shots)

        # Check for red card events up to minute m
        h_reds = sum(
            1
            for e in events
            if getattr(e, "minute", 0) <= m
            and str(getattr(e, "team_id", "")) == home_team_id
            and "red card" in str(getattr(e, "text", "")).lower()
        )
        a_reds = sum(
            1
            for e in events
            if getattr(e, "minute", 0) <= m
            and str(getattr(e, "team_id", "")) == away_team_id
            and "red card" in str(getattr(e, "text", "")).lower()
        )

        pt = calculate_live_win_probability(
            minute=m,
            current_home_goals=h_goals,
            current_away_goals=a_goals,
            home_xg=h_xg,
            away_xg=a_xg,
            home_red_cards=h_reds,
            away_red_cards=a_reds,
            prematch_lambda_home=prematch_lambda_home,
            prematch_lambda_away=prematch_lambda_away,
        )

        # Flag if a goal happened exactly at minute m
        goal_flag = None
        for s in shots:
            if getattr(s, "minute", 0) == m and getattr(s, "outcome", "") == "goal":
                goal_flag = "home" if str(getattr(s, "team_id", "")) == home_team_id else "away"
                break

        history.append(
            {
                "minute": m,
                "home": pt["home"],
                "draw": pt["draw"],
                "away": pt["away"],
                "goal": goal_flag,
                "home_score": h_goals,
                "away_score": a_goals,
            }
        )

    current_state = (
        history[-1]
        if history
        else {
            "home": 0.33,
            "draw": 0.34,
            "away": 0.33,
            "next_goal": {"home": 0.3, "away": 0.2, "none": 0.5},
        }
    )

    return current_state, history
