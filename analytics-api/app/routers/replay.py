"""Replay endpoints for tactical 2D player tracking data."""

import gzip
import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request, Response

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/replay", tags=["replay"])

# Path to replay chunks data directory
REPLAY_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "replay"


def _get_match_dir(match_id: int) -> Path:
    match_dir = REPLAY_DATA_DIR / str(match_id)
    if not match_dir.exists() or not match_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Replay for match {match_id} not found")
    return match_dir


@router.get("/matches")
def list_replay_matches() -> list[dict[str, Any]]:
    """List all available replay matches with summary metadata."""
    if not REPLAY_DATA_DIR.exists():
        return []

    matches = []
    for item in sorted(REPLAY_DATA_DIR.iterdir()):
        if item.is_dir():
            meta_path = item / "meta.json"
            if meta_path.exists():
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                    matches.append(
                        {
                            "id": meta.get("match_id"),
                            "date_time": meta.get("date_time"),
                            "stadium": meta.get("stadium"),
                            "pitch_length": meta.get("pitch_length", 105),
                            "pitch_width": meta.get("pitch_width", 68),
                            "home_team": meta.get("home_team"),
                            "away_team": meta.get("away_team"),
                            "total_duration_seconds": meta.get("total_duration_seconds"),
                            "total_chunks": meta.get("total_chunks"),
                            "events_count": len(meta.get("events", [])),
                            "credit": meta.get(
                                "credit", "Tracking data: SkillCorner Open Data (MIT)"
                            ),
                        }
                    )
                except (json.JSONDecodeError, OSError, KeyError) as e:
                    logger.warning("Failed to parse replay metadata for %s: %s", item.name, e)
                    continue

    return matches


@router.get("/{match_id}/meta")
def get_replay_meta(match_id: int) -> dict[str, Any]:
    """Get full metadata, players, periods, and key events for a match replay."""
    match_dir = _get_match_dir(match_id)
    meta_path = match_dir / "meta.json"
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail=f"Meta for match {match_id} not found")

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    return meta


@router.get("/{match_id}/frames")
def get_replay_frames(
    match_id: int,
    request: Request,
    chunk: int | None = Query(None, description="0-indexed 60-second chunk"),
    from_sec: float | None = Query(None, alias="from", description="Start time in seconds"),
    to_sec: float | None = Query(None, alias="to", description="End time in seconds"),
):
    """Get 60-second frame chunk with caching.

    Returns 10 fps player/ball positions and 1 Hz team shape measurements.
    """
    match_dir = _get_match_dir(match_id)

    # Determine chunk index
    if chunk is not None:
        chunk_idx = chunk
    elif from_sec is not None:
        chunk_idx = int(from_sec // 60)
    else:
        chunk_idx = 0

    chunk_path = match_dir / f"chunk_{chunk_idx}.json.gz"
    if not chunk_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Chunk {chunk_idx} not found for match {match_id}",
        )

    with open(chunk_path, "rb") as f:
        raw_gzip = f.read()

    accept_encoding = request.headers.get("accept-encoding", "")
    headers = {
        "Cache-Control": "public, max-age=31536000, immutable",
    }

    if "gzip" in accept_encoding:
        headers["Content-Encoding"] = "gzip"
        return Response(content=raw_gzip, media_type="application/json", headers=headers)
    else:
        decompressed = gzip.decompress(raw_gzip)
        return Response(content=decompressed, media_type="application/json", headers=headers)
