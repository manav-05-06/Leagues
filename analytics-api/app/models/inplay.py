import math
from typing import Any

import numpy as np
from scipy.stats import poisson


def calculate_live_win_probability(
    minute: int,
    period: int = 1,
    added: int = 0,
    current_home_goals: int = 0,
    current_away_goals: int = 0,
    home_xg: float = 0.0,
    away_xg: float = 0.0,
    home_red_cards: int = 0,
    away_red_cards: int = 0,
    prematch_lambda_home: float = 1.35,
    prematch_lambda_away: float = 1.10,
    is_finished: bool = False,
    added_time: int | None = None,
) -> dict[str, Any]:
    """In-play Poisson model blending pre-match expected goals with live xG rate,

    scaled by remaining time and adjusted for red cards.
    Vectorized over 0..10 goals.
    """
    if added_time is not None and added == 0:
        added = added_time

    if is_finished:
        if current_home_goals > current_away_goals:
            hw, dr, aw = 1.0, 0.0, 0.0
        elif current_home_goals == current_away_goals:
            hw, dr, aw = 0.0, 1.0, 0.0
        else:
            hw, dr, aw = 0.0, 0.0, 1.0

        return {
            "minute": minute,
            "added": added,
            "period": period,
            "home": hw,
            "draw": dr,
            "away": aw,
            "next_goal": None,
            "rem_lambda": {"home": 0.0, "away": 0.0},
        }

    # Automatically infer period if not set and minute > 45
    if period == 1 and minute > 45:
        period = 2

    # 1. Time accounting:
    # First-half stoppage time does not consume second-half playing time
    played = min(minute, 90)
    time_left = max(0, 90 - minute) + max(0, 4 - (added if period >= 2 else 0))

    if time_left <= 0:
        if current_home_goals > current_away_goals:
            hw, dr, aw = 1.0, 0.0, 0.0
        elif current_home_goals == current_away_goals:
            hw, dr, aw = 0.0, 1.0, 0.0
        else:
            hw, dr, aw = 0.0, 0.0, 1.0
        return {
            "minute": minute,
            "added": added,
            "period": period,
            "home": hw,
            "draw": dr,
            "away": aw,
            "next_goal": {"home": 0.0, "away": 0.0, "none": 1.0},
            "rem_lambda": {"home": 0.0, "away": 0.0},
        }

    r = time_left / 90.0
    w = min(0.60, played / 90.0)

    # 2. Extrapolated live xG rate per 90
    rate_h_live = (home_xg / max(played, 1)) * 90.0
    rate_a_live = (away_xg / max(played, 1)) * 90.0

    # 3. Remaining goal expectancies
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

    # 4. Vectorized Poisson grid computation (0..10 goals)
    goals_range = np.arange(11)
    pmf_h = poisson.pmf(goals_range, rem_h)
    pmf_a = poisson.pmf(goals_range, rem_a)
    p_matrix = np.outer(pmf_h, pmf_a)

    total_p = np.sum(p_matrix)
    if total_p > 0:
        p_matrix /= total_p

    # Meshgrid difference
    kh, ka = np.meshgrid(goals_range, goals_range, indexing="ij")
    final_diff = (current_home_goals + kh) - (current_away_goals + ka)

    hw = float(np.sum(p_matrix[final_diff > 0]))
    dr = float(np.sum(p_matrix[final_diff == 0]))
    aw = float(np.sum(p_matrix[final_diff < 0]))

    # Normalize home + draw + away
    total_outcome = hw + dr + aw
    if total_outcome > 0:
        hw /= total_outcome
        dr /= total_outcome
        aw /= total_outcome

    # 5. Next goal probabilities
    total_rem = rem_h + rem_a
    p_none = math.exp(-total_rem)
    if total_rem > 0:
        p_next_h = (1.0 - p_none) * (rem_h / total_rem)
        p_next_a = (1.0 - p_none) * (rem_a / total_rem)
    else:
        p_next_h, p_next_a = 0.0, 0.0

    return {
        "minute": minute,
        "added": added,
        "period": period,
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
    score_events: list[Any] | None = None,
    shots: list[Any] | None = None,
    events: list[Any] | None = None,
    home_team_id: str = "",
    away_team_id: str = "",
    status: str = "post",  # 'pre', 'in', 'post'
    current_minute: int = 90,
    current_added: int = 0,
    current_period: int = 2,
    prematch_lambda_home: float = 1.35,
    prematch_lambda_away: float = 1.10,
    home_name: str = "Home",
    away_name: str = "Away",
    max_minute: int | None = None,
) -> tuple[dict[str, Any], list[dict[str, Any]], dict[str, Any] | None]:
    """Rebuild win probability history in match order up to current playing time.

    Returns:
        (now_win_prob, history_points, biggest_moment)
    """
    if score_events is None:
        score_events = []
    if shots is None:
        shots = []
    if events is None:
        events = []
    if max_minute is not None:
        current_minute = max_minute

    is_finished = status == "post"

    # Find max added time in period 1 and period 2
    max_a1 = 0
    max_a2 = 0
    for e in score_events + shots + events:
        p = getattr(e, "period", 1)
        a = getattr(e, "added", 0)
        if p == 1 and a > max_a1:
            max_a1 = a
        elif p == 2 and a > max_a2:
            max_a2 = a

    if status == "in":
        if current_period == 1 and current_added > max_a1:
            max_a1 = current_added
        elif current_period == 2 and current_added > max_a2:
            max_a2 = current_added

    # Build sequence of timeline points (period, minute, added)
    points: list[tuple[int, int, int]] = []

    # Period 1
    p1_limit = 45 if (status != "in" or current_period > 1) else min(current_minute, 45)
    for m in range(p1_limit + 1):
        points.append((1, m, 0))

    if (status != "in" or current_period > 1) and max_a1 > 0:
        for a in range(1, max_a1 + 1):
            points.append((1, 45, a))
    elif status == "in" and current_period == 1 and current_minute >= 45 and current_added > 0:
        for a in range(1, current_added + 1):
            points.append((1, 45, a))

    # Period 2
    if status != "in" or current_period >= 2:
        p2_start = 46
        p2_limit = 90 if status != "in" else min(current_minute, 90)
        for m in range(p2_start, p2_limit + 1):
            points.append((2, m, 0))

        if status != "in" and max_a2 > 0:
            for a in range(1, max_a2 + 1):
                points.append((2, 90, a))
        elif status == "in" and current_period == 2 and current_minute >= 90 and current_added > 0:
            for a in range(1, current_added + 1):
                points.append((2, 90, a))

    history: list[dict[str, Any]] = []

    for p, m, a in points:
        # 1. Running score from score_events up to (p, m, a)
        h_score = 0
        a_score = 0
        for se in score_events:
            se_p = getattr(se, "period", 1)
            se_m = getattr(se, "minute", 0)
            se_a = getattr(se, "added", 0)
            if (se_p, se_m, se_a) <= (p, m, a):
                if (
                    getattr(se, "side", "") == "home"
                    or str(getattr(se, "team_id", "")) == home_team_id
                ):
                    h_score += 1
                else:
                    a_score += 1

        # 2. xG accumulated up to (p, m, a)
        h_xg = sum(
            float(getattr(s, "xg", 0.0))
            for s in shots
            if (getattr(s, "period", 1), getattr(s, "minute", 0), getattr(s, "added", 0))
            <= (p, m, a)
            and str(getattr(s, "team_id", "")) == home_team_id
        )
        a_xg = sum(
            float(getattr(s, "xg", 0.0))
            for s in shots
            if (getattr(s, "period", 1), getattr(s, "minute", 0), getattr(s, "added", 0))
            <= (p, m, a)
            and str(getattr(s, "team_id", "")) == away_team_id
        )

        # 3. Red cards up to (p, m, a)
        h_reds = sum(
            1
            for e in events
            if getattr(e, "type", "") == "red_card"
            and (getattr(e, "period", 1), getattr(e, "minute", 0), getattr(e, "added", 0))
            <= (p, m, a)
            and str(getattr(e, "team_id", "")) == home_team_id
        )
        a_reds = sum(
            1
            for e in events
            if getattr(e, "type", "") == "red_card"
            and (getattr(e, "period", 1), getattr(e, "minute", 0), getattr(e, "added", 0))
            <= (p, m, a)
            and str(getattr(e, "team_id", "")) == away_team_id
        )

        # Calculate win probabilities
        calc = calculate_live_win_probability(
            minute=m,
            period=p,
            added=a,
            current_home_goals=h_score,
            current_away_goals=a_score,
            home_xg=h_xg,
            away_xg=a_xg,
            home_red_cards=h_reds,
            away_red_cards=a_reds,
            prematch_lambda_home=prematch_lambda_home,
            prematch_lambda_away=prematch_lambda_away,
            is_finished=False,
        )

        # Did a goal or red card happen at this exact point?
        goal_flag = None
        for se in score_events:
            if (getattr(se, "period", 1), getattr(se, "minute", 0), getattr(se, "added", 0)) == (
                p,
                m,
                a,
            ):
                goal_flag = getattr(se, "side", "home")
                break

        red_flag = None
        for e in events:
            if getattr(e, "type", "") == "red_card" and (
                getattr(e, "period", 1),
                getattr(e, "minute", 0),
                getattr(e, "added", 0),
            ) == (p, m, a):
                red_flag = "home" if str(getattr(e, "team_id", "")) == home_team_id else "away"
                break

        lbl = f"{m}+{a}'" if a > 0 else f"{m}'"

        history.append(
            {
                "minute": m,
                "added": a,
                "period": p,
                "label": lbl,
                "home": calc["home"],
                "draw": calc["draw"],
                "away": calc["away"],
                "goal": goal_flag,
                "red_card": red_flag,
                "home_score": h_score,
                "away_score": a_score,
            }
        )

    # For finished match, append final whistle point FT with exact result
    if is_finished:
        final_h_score = score_events[-1].home_score if score_events else 0
        final_a_score = score_events[-1].away_score if score_events else 0
        if final_h_score > final_a_score:
            f_home, f_draw, f_away = 1.0, 0.0, 0.0
        elif final_h_score == final_a_score:
            f_home, f_draw, f_away = 0.0, 1.0, 0.0
        else:
            f_home, f_draw, f_away = 0.0, 0.0, 1.0

        history.append(
            {
                "minute": 90,
                "added": max_a2,
                "period": 2,
                "label": "FT",
                "home": f_home,
                "draw": f_draw,
                "away": f_away,
                "goal": None,
                "red_card": None,
                "home_score": final_h_score,
                "away_score": final_a_score,
            }
        )

    # Find biggest moment (|Δ| >= 0.15 for event that moved win chance)
    biggest_moment = None
    max_delta = 0.0

    # Map history points by (period, minute, added)
    hist_map = {(h["period"], h["minute"], h["added"]): h for h in history}

    # Evaluate all score events
    for se in score_events:
        pt_key = (getattr(se, "period", 1), getattr(se, "minute", 0), getattr(se, "added", 0))
        if pt_key in hist_map:
            idx = history.index(hist_map[pt_key])
            prev_pt = history[idx - 1] if idx > 0 else history[0]
            curr_pt = history[idx]
            side = getattr(se, "side", "home")
            p_before = prev_pt[side]
            p_after = curr_pt[side]
            delta = abs(p_after - p_before)
            if delta > max_delta:
                max_delta = delta
                team_disp = home_name if side == "home" else away_name
                biggest_moment = {
                    "player": getattr(se, "player_name", "Unknown"),
                    "event_type": "goal",
                    "minute": getattr(se, "label", f"{getattr(se, 'minute', 0)}'"),
                    "team": team_disp,
                    "from_pct": round(p_before * 100),
                    "to_pct": round(p_after * 100),
                    "delta": delta,
                }

    # Evaluate red cards
    for e in events:
        if getattr(e, "type", "") == "red_card":
            pt_key = (getattr(e, "period", 1), getattr(e, "minute", 0), getattr(e, "added", 0))
            if pt_key in hist_map:
                idx = history.index(hist_map[pt_key])
                prev_pt = history[idx - 1] if idx > 0 else history[0]
                curr_pt = history[idx]
                victim_side = "home" if str(getattr(e, "team_id", "")) == home_team_id else "away"
                benefiting_side = "away" if victim_side == "home" else "home"
                p_before = prev_pt[benefiting_side]
                p_after = curr_pt[benefiting_side]
                delta = abs(p_after - p_before)
                if delta > max_delta:
                    max_delta = delta
                    team_disp = home_name if benefiting_side == "home" else away_name
                    biggest_moment = {
                        "player": getattr(e, "player_name", "Red card"),
                        "event_type": "red card",
                        "minute": getattr(e, "label", f"{getattr(e, 'minute', 0)}'"),
                        "team": team_disp,
                        "from_pct": round(p_before * 100),
                        "to_pct": round(p_after * 100),
                        "delta": delta,
                    }

    # Only keep biggest moment if delta >= 0.15
    if max_delta < 0.15:
        biggest_moment = None

    # Derive "now" state
    if is_finished:
        now_state = {
            "home": history[-1]["home"],
            "draw": history[-1]["draw"],
            "away": history[-1]["away"],
            "next_goal": None,
        }
    else:
        last_hist = history[-1] if history else {"home": 0.33, "draw": 0.34, "away": 0.33}
        # Compute next_goal at current minute
        h_xg = sum(
            float(getattr(s, "xg", 0.0))
            for s in shots
            if str(getattr(s, "team_id", "")) == home_team_id
        )
        a_xg = sum(
            float(getattr(s, "xg", 0.0))
            for s in shots
            if str(getattr(s, "team_id", "")) == away_team_id
        )
        h_score = score_events[-1].home_score if score_events else 0
        a_score = score_events[-1].away_score if score_events else 0
        calc_now = calculate_live_win_probability(
            minute=current_minute,
            period=current_period,
            added=current_added,
            current_home_goals=h_score,
            current_away_goals=a_score,
            home_xg=h_xg,
            away_xg=a_xg,
            prematch_lambda_home=prematch_lambda_home,
            prematch_lambda_away=prematch_lambda_away,
            is_finished=False,
        )
        now_state = {
            "home": last_hist["home"],
            "draw": last_hist["draw"],
            "away": last_hist["away"],
            "next_goal": calc_now["next_goal"],
        }

    return now_state, history, biggest_moment
