"""Admin endpoints for operational management and background maintenance."""

import logging
import secrets
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


def _sync_refresh() -> None:
    """Run results backfill, rating refit, and backtest synchronously in a worker thread."""
    logger.info("Starting background results backfill and rating refit...")
    try:
        from app.routers.analytics import _analytics_finished_cache, _analytics_live_cache
        from app.routers.predict import _models_cache
        from training import backfill_results, backtest, fit_ratings

        logger.info("Running backfill_results.run()...")
        backfill_results.run()
        logger.info("Running fit_ratings.run()...")
        fit_ratings.run()
        logger.info("Running backtest.run()...")
        backtest.run()

        # Clear cached models and analytics responses
        _models_cache.clear()
        _analytics_live_cache.clear()
        _analytics_finished_cache.clear()
        logger.info("Background model and results refresh completed successfully.")
    except Exception as exc:  # noqa: BLE001
        logger.error("Background refresh failed: %s", exc)


@router.post("/refresh")
async def trigger_refresh(
    background_tasks: BackgroundTasks,
    x_admin_token: str | None = Header(None, alias="X-Admin-Token"),
) -> dict[str, Any]:
    """Trigger background refresh of results, ratings, and accuracy metrics.

    Requires X-Admin-Token header. Returns 503 if ADMIN_TOKEN is not configured.
    """
    if not settings.admin_token:
        raise HTTPException(
            status_code=503,
            detail="Refresh disabled: ADMIN_TOKEN is not configured.",
        )

    if not x_admin_token or not secrets.compare_digest(x_admin_token, settings.admin_token):
        raise HTTPException(status_code=401, detail="Invalid or missing X-Admin-Token")

    background_tasks.add_task(_sync_refresh)
    return {
        "status": "refresh_scheduled",
        "message": "Results and models refresh started in background",
    }
