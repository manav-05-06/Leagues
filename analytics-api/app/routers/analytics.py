from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.espn.client import get_summary
from app.espn.parser import Event, Shot, parse_summary
from app.models.inplay import build_win_probability_history
from app.models.momentum import calculate_momentum_wave
from app.models.players import PlayerStats, TeamRoster, extract_player_statistics
from app.models.xg import calculate_xg

router = APIRouter(prefix="/matches", tags=["analytics"])


class XgTimelinePoint(BaseModel):
    minute: int
    home: float
    away: float
    goal: str | None = None  # "home", "away", or None
    shooter: str | None = None


class XgSummary(BaseModel):
    home: float
    away: float
    timeline: list[XgTimelinePoint] = Field(default_factory=list)


class WinProbPoint(BaseModel):
    minute: int
    home: float
    draw: float
    away: float
    goal: str | None = None
    home_score: int = 0
    away_score: int = 0


class NextGoalProb(BaseModel):
    home: float
    away: float
    none: float


class WinProbSummary(BaseModel):
    home: float
    draw: float
    away: float
    next_goal: NextGoalProb | None = None
    history: list[WinProbPoint] = Field(default_factory=list)


class MomentumPoint(BaseModel):
    minute: int
    momentum: float
    home: float
    away: float


class MatchAnalyticsResponse(BaseModel):
    match: dict[str, Any]
    shots: list[Shot]
    xg: XgSummary
    events: list[Event]
    win_prob: WinProbSummary
    momentum: list[MomentumPoint] = Field(default_factory=list)
    players: list[PlayerStats] = Field(default_factory=list)
    rosters: list[TeamRoster] = Field(default_factory=list)


def build_xg_timeline(
    shots: list[Shot], home_team_id: str, away_team_id: str, max_minute: int
) -> tuple[float, float, list[XgTimelinePoint]]:
    # Sort shots chronologically
    sorted_shots = sorted(shots, key=lambda s: (s.period, s.minute, s.second))

    cum_home = 0.0
    cum_away = 0.0

    timeline: list[XgTimelinePoint] = [XgTimelinePoint(minute=0, home=0.0, away=0.0)]

    for shot in sorted_shots:
        is_home = shot.team_id == home_team_id
        if is_home:
            cum_home += shot.xg
        else:
            cum_away += shot.xg

        goal_flag = None
        if shot.outcome == "goal":
            goal_flag = "home" if is_home else "away"

        timeline.append(
            XgTimelinePoint(
                minute=shot.minute,
                home=round(cum_home, 4),
                away=round(cum_away, 4),
                goal=goal_flag,
                shooter=shot.player_name if goal_flag else None,
            )
        )

    # Ensure final timeline point extends to current minute / 90
    final_min = max(max_minute, timeline[-1].minute if timeline else 90, 90)
    if not timeline or timeline[-1].minute < final_min:
        timeline.append(
            XgTimelinePoint(
                minute=final_min,
                home=round(cum_home, 4),
                away=round(cum_away, 4),
            )
        )

    return round(cum_home, 2), round(cum_away, 2), timeline


@router.get("/{event_id}/analytics", response_model=MatchAnalyticsResponse)
async def get_match_analytics(event_id: str):
    """
    Get match analytics including shots with calculated xG, xG timeline,
    live win probability history, and rolling momentum wave.
    """
    try:
        summary = await get_summary(event_id)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to fetch match data from upstream provider: {exc}",
        ) from exc

    if not summary:
        raise HTTPException(status_code=404, detail="Match event not found")

    parsed = parse_summary(summary)

    # Calculate xG for each shot
    for shot in parsed.shots:
        shot.xg = calculate_xg(shot)

    home_id = str(parsed.home_team.get("id", ""))
    away_id = str(parsed.away_team.get("id", ""))

    home_total, away_total, timeline = build_xg_timeline(
        parsed.shots, home_id, away_id, parsed.minute
    )

    # In-play win probability history
    curr_prob, prob_history = build_win_probability_history(
        shots=parsed.shots,
        events=parsed.events,
        home_team_id=home_id,
        away_team_id=away_id,
        max_minute=parsed.minute,
    )

    win_prob_summary = WinProbSummary(
        home=curr_prob["home"],
        draw=curr_prob["draw"],
        away=curr_prob["away"],
        next_goal=curr_prob.get("next_goal"),
        history=[WinProbPoint(**p) for p in prob_history],
    )

    # Momentum wave calculation
    momentum_data = calculate_momentum_wave(
        shots=parsed.shots,
        events=parsed.events,
        home_team_id=home_id,
        away_team_id=away_id,
        max_minute=parsed.minute,
    )

    # Player stats & formation lineups
    all_players, rosters = extract_player_statistics(
        summary=summary,
        shots=parsed.shots,
        events=parsed.events,
    )

    match_meta = {
        "id": parsed.event_id,
        "status": parsed.status,
        "status_detail": parsed.status_detail,
        "minute": parsed.minute,
        "home": parsed.home_team,
        "away": parsed.away_team,
    }

    return MatchAnalyticsResponse(
        match=match_meta,
        shots=parsed.shots,
        xg=XgSummary(home=home_total, away=away_total, timeline=timeline),
        events=parsed.events,
        win_prob=win_prob_summary,
        momentum=[MomentumPoint(**m) for m in momentum_data],
        players=all_players,
        rosters=rosters,
    )
