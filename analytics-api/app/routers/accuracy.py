import json

from fastapi import APIRouter, HTTPException, Query

from app.models.dixon_coles import ARTIFACTS_DIR

router = APIRouter(prefix="/models", tags=["accuracy"])


@router.get("/accuracy")
async def get_model_accuracy(league: str = Query("all", description="League slug or 'all'")):
    """
    Returns empirical backtest evaluation metrics (RPS, Brier score, calibration).
    """
    if league == "all":
        file_path = ARTIFACTS_DIR / "accuracy_all.json"
    else:
        file_path = ARTIFACTS_DIR / f"accuracy_{league}.json"

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Accuracy report for league '{league}' not found.",
        )

    try:
        content = file_path.read_text(encoding="utf-8")
        return json.loads(content)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load accuracy report: {exc}",
        ) from exc
