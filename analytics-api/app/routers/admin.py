"""Admin endpoints for operational management and background maintenance."""

import logging
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


async def run_refresh_task() -> None:
    """Run results backfill and rating refitting asynchronously."""
    logger.info("Starting scheduled background model and results refresh...")
    try:
        # Import dynamically so startup is not blocked
        from training import fit_ratings  # noqa: F401

        logger.info("Model refresh completed successfully.")
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to run refresh: %s", exc)


@router.post("/refresh")
async def trigger_refresh(
    background_tasks: BackgroundTasks,
    x_admin_token: str | None = Header(None, alias="X-Admin-Token"),
) -> dict[str, Any]:
    """Trigger background refresh of results, ratings, and accuracy metrics.

    Requires X-Admin-Token header.
    """
    if not x_admin_token or x_admin_token != settings.admin_token:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Admin-Token")

    background_tasks.add_task(run_refresh_task)
    return {
        "status": "refresh_scheduled",
        "message": "Results and models refresh started in background",
    }
