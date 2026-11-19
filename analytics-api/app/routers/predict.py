import sqlite3
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.models.dixon_coles import ARTIFACTS_DIR, DixonColesModel

router = APIRouter(prefix="/predict", tags=["prediction"])
DB_PATH = Path(__file__).parent.parent.parent / "data" / "results.db"

_models_cache: dict[str, DixonColesModel] = {}


class ExpectedGoals(BaseModel):
    home: float
    away: float


class WinProbability(BaseModel):
    home: float
    draw: float
    away: float


class TopScore(BaseModel):
    score: str
    home: int
    away: int
    prob: float


class PrematchPredictionResponse(BaseModel):
    league: str
    home_id: str
    away_id: str
    home_name: str
    away_name: str
    expected_goals: ExpectedGoals
    win_probability: WinProbability
    over_25: float
    btts: float
    top_scores: list[TopScore] = Field(default_factory=list)
    score_grid: list[list[float]] = Field(default_factory=list)


def load_matches_from_db(league: str) -> list[dict[str, Any]]:
    if not DB_PATH.exists():
        return []

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    with conn:
        rows = conn.execute(
            """
            SELECT id, league, date, season, home_id, away_id, home_name, away_name, home_goals, away_goals
            FROM matches
            WHERE league = ?
            ORDER BY date ASC;
            """,
            (league,),
        ).fetchall()

    return [dict(r) for r in rows]


def get_or_train_model(league: str) -> DixonColesModel:
    if league in _models_cache:
        return _models_cache[league]

    artifact_file = ARTIFACTS_DIR / f"ratings_{league}.json"
    if artifact_file.exists():
        try:
            model = DixonColesModel.load(artifact_file)
            _models_cache[league] = model
            return model
        except (OSError, ValueError):
            pass

    # Fit from DB
    matches = load_matches_from_db(league)
    if not matches:
        # Fallback to general model or raise error
        raise HTTPException(
            status_code=404,
            detail=f"No match history found in results database for league '{league}'.",
        )

    model = DixonColesModel(league=league)
    model.fit(matches)
    try:
        model.save(artifact_file)
    except OSError:
        pass

    _models_cache[league] = model
    return model


def resolve_team_id(model: DixonColesModel, team_identifier: str) -> str:
    cleaned = team_identifier.strip().lower()

    # Exact ID match
    if str(team_identifier) in model.team_indices:
        return str(team_identifier)

    # Search by display name
    for t_id, name in model.team_names.items():
        if name.lower() == cleaned:
            return t_id

    # Partial name match
    for t_id, name in model.team_names.items():
        if cleaned in name.lower() or name.lower() in cleaned:
            return t_id

    return team_identifier


@router.get("/prematch", response_model=PrematchPredictionResponse)
async def predict_prematch(
    league: str = Query(..., description="League slug (e.g. eng.1, esp.1)"),
    home: str = Query(..., description="Home team name or ID"),
    away: str = Query(..., description="Away team name or ID"),
):
    """
    Generate pre-match prediction using the Dixon-Coles Poisson model.
    """
    model = get_or_train_model(league)

    home_id = resolve_team_id(model, home)
    away_id = resolve_team_id(model, away)

    pred = model.predict_match(home_id, away_id)
    return PrematchPredictionResponse(**pred)
