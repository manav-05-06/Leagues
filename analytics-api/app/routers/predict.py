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


def resolve_team_id(
    model: DixonColesModel, team_id: str | None = None, team_name: str | None = None
) -> str:
    # 1. Exact ID match if team_id provided
    if team_id is not None:
        tid_str = str(team_id).strip()
        if tid_str in model.team_indices:
            return tid_str

    ident = team_id if team_id is not None else team_name
    if not ident:
        raise HTTPException(status_code=400, detail="Team identifier required")

    cleaned = str(ident).strip().lower()

    # Exact ID match
    if str(ident).strip() in model.team_indices:
        return str(ident).strip()

    # Exact display name match (case-insensitive)
    for t_id, name in model.team_names.items():
        if name.strip().lower() == cleaned:
            return t_id

    # No fuzzy/partial match allowed: return 404
    raise HTTPException(
        status_code=404,
        detail=f"Team '{ident}' not found in ratings for league '{model.league}'",
    )


@router.get("/prematch", response_model=PrematchPredictionResponse)
async def predict_prematch(
    league: str = Query(..., description="League slug (e.g. eng.1, esp.1)"),
    home: str | None = Query(None, description="Home team name or ID"),
    away: str | None = Query(None, description="Away team name or ID"),
    home_id: str | None = Query(None, description="Home team ID"),
    away_id: str | None = Query(None, description="Away team ID"),
):
    """
    Generate pre-match prediction using the Dixon-Coles Poisson model.
    Accepts home_id/away_id or exact team names. Unknown teams return 404.
    """
    if not (home or home_id) or not (away or away_id):
        raise HTTPException(
            status_code=400,
            detail="Both home and away identifiers (home/home_id and away/away_id) are required.",
        )

    model = get_or_train_model(league)

    h_id = resolve_team_id(model, home_id, home)
    a_id = resolve_team_id(model, away_id, away)

    pred = model.predict_match(h_id, a_id)
    return PrematchPredictionResponse(**pred)
