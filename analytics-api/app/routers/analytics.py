from typing import Any

from cachetools import TTLCache
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.espn.client import get_summary
from app.espn.parser import Event, ScoreEvent, Shot, parse_summary
from app.models.dixon_coles import ARTIFACTS_DIR, DixonColesModel
from app.models.inplay import build_win_probability_history
from app.models.momentum import calculate_momentum_wave
from app.models.players import PlayerStats, TeamRoster, extract_player_statistics
from app.models.story import generate_match_story
from app.models.xg import calculate_xg

router = APIRouter(prefix="/matches", tags=["analytics"])

# Caches for computed analytics responses: live (20s) and finished (24h)
_analytics_live_cache: TTLCache = TTLCache(maxsize=500, ttl=settings.cache_live_ttl)
_analytics_finished_cache: TTLCache = TTLCache(maxsize=500, ttl=settings.cache_finished_ttl)


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
    added: int = 0
    label: str = ""
    period: int = 1
    home: float
    draw: float
    away: float
    goal: str | None = None
    red_card: str | None = None
    home_score: int = 0
    away_score: int = 0


class NextGoalProb(BaseModel):
    home: float
    away: float
    none: float


class PrematchInfo(BaseModel):
    home: float
    draw: float
    away: float
    expected_goals: dict[str, float]


class WinProbSummary(BaseModel):
    home: float
    draw: float
    away: float
    next_goal: NextGoalProb | None = None
    prematch: PrematchInfo | None = None
    history: list[WinProbPoint] = Field(default_factory=list)


class MomentumPoint(BaseModel):
    minute: int
    momentum: float
    home: float
    away: float


class MatchAnalyticsResponse(BaseModel):
    match: dict[str, Any]
    score_events: list[ScoreEvent] = Field(default_factory=list)
    story: list[str] = Field(default_factory=list)
    shots: list[Shot]
    xg: XgSummary
    events: list[Event]
    win_prob: WinProbSummary
    momentum: list[MomentumPoint] = Field(default_factory=list)
    players: list[PlayerStats] = Field(default_factory=list)
    rosters: list[TeamRoster] = Field(default_factory=list)


def get_prematch_ratings(
    league: str, home_id: str, away_id: str
) -> tuple[float, float, PrematchInfo | None]:
    if not league:
        return 1.35, 1.10, None

    ratings_file = ARTIFACTS_DIR / f"ratings_{league}.json"
    if ratings_file.exists():
        try:
            model = DixonColesModel.load(ratings_file)
            pred = model.predict_match(home_id, away_id)
            prematch_obj = PrematchInfo(
                home=pred["win_probability"]["home"],
                draw=pred["win_probability"]["draw"],
                away=pred["win_probability"]["away"],
                expected_goals=pred["expected_goals"],
            )
            return (
                pred["expected_goals"]["home"],
                pred["expected_goals"]["away"],
                prematch_obj,
            )
        except (OSError, ValueError, KeyError):
            return 1.35, 1.10, None
    return 1.35, 1.10, None


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
    live win probability history, score events, match story, and rolling momentum wave.
    """
    # 1. Check response cache (24h for finished, 20s for live)
    if event_id in _analytics_finished_cache:
        return _analytics_finished_cache[event_id]
    if event_id in _analytics_live_cache:
        return _analytics_live_cache[event_id]

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

    # Look up Dixon-Coles pre-match ratings
    lambda_h_pre, lambda_a_pre, prematch_info = get_prematch_ratings(
        parsed.league, home_id, away_id
    )

    # In-play win probability history
    curr_prob, prob_history, biggest_moment = build_win_probability_history(
        score_events=parsed.score_events,
        shots=parsed.shots,
        events=parsed.events,
        home_team_id=home_id,
        away_team_id=away_id,
        status=parsed.status,
        current_minute=parsed.minute,
        current_added=parsed.added,
        current_period=2 if parsed.minute > 45 else 1,
        prematch_lambda_home=lambda_h_pre,
        prematch_lambda_away=lambda_a_pre,
        home_name=parsed.home_team.get("name", "Home"),
        away_name=parsed.away_team.get("name", "Away"),
    )

    win_prob_summary = WinProbSummary(
        home=curr_prob["home"],
        draw=curr_prob["draw"],
        away=curr_prob["away"],
        next_goal=curr_prob.get("next_goal"),
        prematch=prematch_info,
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

    # Deterministic match story
    story = generate_match_story(
        status=parsed.status,
        home_name=parsed.home_team.get("name", "Home"),
        away_name=parsed.away_team.get("name", "Away"),
        home_score=parsed.home_team.get("score", 0),
        away_score=parsed.away_team.get("score", 0),
        home_xg=home_total,
        away_xg=away_total,
        minute_label=parsed.minute_label,
        win_prob={
            "home": curr_prob["home"],
            "draw": curr_prob["draw"],
            "away": curr_prob["away"],
        },
        biggest_moment=biggest_moment,
    )

    match_meta = {
        "id": parsed.event_id,
        "status": parsed.status,
        "status_detail": parsed.status_detail,
        "minute": parsed.minute,
        "added": parsed.added,
        "minute_label": parsed.minute_label,
        "league": parsed.league,
        "home": parsed.home_team,
        "away": parsed.away_team,
    }

    response = MatchAnalyticsResponse(
        match=match_meta,
        score_events=parsed.score_events,
        story=story,
        shots=parsed.shots,
        xg=XgSummary(home=home_total, away=away_total, timeline=timeline),
        events=parsed.events,
        win_prob=win_prob_summary,
        momentum=[MomentumPoint(**m) for m in momentum_data],
        players=all_players,
        rosters=rosters,
    )

    if parsed.status == "post":
        _analytics_finished_cache[event_id] = response
    else:
        _analytics_live_cache[event_id] = response

    return response
