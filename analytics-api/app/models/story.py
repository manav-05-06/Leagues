"""Match story generation using deterministic templates based on match state,

expected goals, scoreline, and pivotal win-probability swings.
"""

from typing import Any


def generate_match_story(
    status: str,  # 'pre', 'in', 'post'
    home_name: str,
    away_name: str,
    home_score: int,
    away_score: int,
    home_xg: float,
    away_xg: float,
    minute_label: str = "",
    win_prob: dict[str, float] | None = None,
    biggest_moment: dict[str, Any] | None = None,
) -> list[str]:
    """Generate 1-3 plain-language sentences summarizing the match trajectory."""
    if status == "pre":
        return []

    story: list[str] = []
    score_str = f"{home_score}-{away_score}"
    h_xg_r = round(home_xg, 1)
    a_xg_r = round(away_xg, 1)
    xg_gap = abs(h_xg_r - a_xg_r)

    if status == "post":
        # Finished match
        if home_score > away_score:
            w_name, l_name = home_name, away_name
            w_xg, l_xg = h_xg_r, a_xg_r
            w_score, l_score = home_score, away_score
        elif away_score > home_score:
            w_name, l_name = away_name, home_name
            w_xg, l_xg = a_xg_r, h_xg_r
            w_score, l_score = away_score, home_score
        else:
            w_name, l_name = None, None
            w_xg, l_xg = h_xg_r, a_xg_r
            w_score, l_score = home_score, away_score

        if w_name is not None:
            # A team won
            if w_xg - l_xg >= 0.3:
                # Winner also had better chances
                story.append(
                    f"{w_name} beat {l_name} {w_score}-{l_score} and deserved it: they created the better chances ({w_xg} vs {l_xg} expected goals)."
                )
            elif l_xg - w_xg >= 0.3:
                # Loser had better chances
                story.append(
                    f"{w_name} beat {l_name} {w_score}-{l_score}, but {l_name} created the better chances ({l_xg} vs {w_xg} expected goals). {w_name} took theirs; {l_name} didn't."
                )
            else:
                # Chances were close
                story.append(
                    f"{w_name} beat {l_name} {w_score}-{l_score} in a close game. Both teams created similar chances."
                )
        else:
            # Draw
            if xg_gap >= 0.3:
                better_team = home_name if h_xg_r > a_xg_r else away_name
                better_xg = max(h_xg_r, a_xg_r)
                worse_xg = min(h_xg_r, a_xg_r)
                story.append(
                    f"{home_name} and {away_name} drew {score_str}. {better_team} created the better chances ({better_xg} vs {worse_xg} expected goals)."
                )
            else:
                story.append(
                    f"{home_name} and {away_name} drew {score_str}. Both teams created similar chances."
                )

    elif status == "in":
        # Live match
        min_display = minute_label if minute_label else "play"
        p_home = round((win_prob or {}).get("home", 0.33) * 100)
        p_away = round((win_prob or {}).get("away", 0.33) * 100)

        if home_score > away_score:
            story.append(
                f"{home_name} lead {score_str} after {min_display}. Right now they have a {p_home}% chance of winning."
            )
        elif away_score > home_score:
            story.append(
                f"{away_name} lead {score_str} after {min_display}. Right now they have a {p_away}% chance of winning."
            )
        else:
            # Level score
            if xg_gap >= 0.3:
                better_team = home_name if h_xg_r > a_xg_r else away_name
                better_xg = max(h_xg_r, a_xg_r)
                worse_xg = min(h_xg_r, a_xg_r)
                story.append(
                    f"It's {score_str} after {min_display}. {better_team} have created the better chances so far ({better_xg} vs {worse_xg} expected goals)."
                )
            else:
                story.append(
                    f"It's {score_str} after {min_display}. Both teams have created similar chances so far."
                )

    # Optional biggest moment sentence if delta >= 15%
    if biggest_moment and len(story) < 3:
        p_name = biggest_moment.get("player") or "A key play"
        ev_type = biggest_moment.get("event_type") or "goal"
        ev_min = biggest_moment.get("minute") or ""
        t_name = biggest_moment.get("team") or "their team"
        f_pct = biggest_moment.get("from_pct", 0)
        t_pct = biggest_moment.get("to_pct", 0)

        min_clause = f" ({ev_min})" if ev_min else ""
        story.append(
            f"Biggest moment: {p_name}'s {ev_type}{min_clause} took {t_name} from {f_pct}% to {t_pct}%."
        )

    return story[:3]
