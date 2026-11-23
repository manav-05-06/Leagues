"""Ingest SkillCorner Open Data match tracking and event files.

Downloads match metadata, dynamic events, and 10 fps extrapolated tracking data;
computes team shapes and defensive line metrics; and exports compressed 60-second
chunks for the tactical replay engine.
"""

import argparse
import csv
import gzip
import io
import json
import logging
import os
import sys
import urllib.request
from typing import Any

# Add parent directory to path so app modules can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.shape import compute_frame_shapes

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

RAW_BASE = "https://raw.githubusercontent.com/SkillCorner/opendata/master/data"
LFS_BASE = "https://media.githubusercontent.com/media/SkillCorner/opendata/master/data"


def fetch_url(url: str, timeout: int = 60) -> bytes:
    """Fetch content from URL with browser-like user agent."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def parse_events_csv(csv_content: str, match_id: int) -> list[dict[str, Any]]:
    """Parse dynamic events to find goals, shots, and major tactical moments."""
    events: list[dict[str, Any]] = []
    if not csv_content:
        return events

    reader = csv.DictReader(io.StringIO(csv_content))
    for row in reader:
        lead_to_goal = row.get("lead_to_goal") == "True"
        lead_to_shot = row.get("lead_to_shot") == "True"
        event_type = row.get("event_type", "")
        event_subtype = row.get("event_subtype", "")

        is_goal = lead_to_goal or "goal" in event_subtype.lower()
        is_shot = "shot" in event_type.lower() or lead_to_shot

        if is_goal or is_shot:
            try:
                min_start = int(row.get("minute_start") or 0)
                sec_start = int(row.get("second_start") or 0)
                period = int(row.get("period") or 1)
                frame_start = int(row.get("frame_start") or 0)
            except (ValueError, TypeError):
                continue

            events.append(
                {
                    "type": "goal" if is_goal else "shot",
                    "subtype": event_subtype or event_type,
                    "minute": min_start,
                    "second": sec_start,
                    "period": period,
                    "frame": frame_start,
                    "player_id": int(row["player_id"]) if row.get("player_id") else None,
                    "player_name": row.get("player_name", ""),
                    "team_id": int(row["team_id"]) if row.get("team_id") else None,
                    "team_name": row.get("team_shortname", ""),
                }
            )

    # Sort events by period and frame
    events.sort(key=lambda e: (e["period"], e["frame"]))
    return events


def ingest_match(
    match_id: int,
    raw_dir: str,
    output_dir: str,
    max_chunks: int | None = None,
) -> dict[str, Any]:
    """Ingest a SkillCorner match and generate metadata and replay chunks."""
    ensure_dir(raw_dir)
    match_replay_dir = os.path.join(output_dir, str(match_id))
    ensure_dir(match_replay_dir)

    # 1. Download or load match.json
    raw_match_path = os.path.join(raw_dir, f"{match_id}_match.json")
    if os.path.exists(raw_match_path):
        with open(raw_match_path, "r", encoding="utf-8") as f:
            match_data = json.load(f)
    else:
        logger.info(f"Downloading match metadata for {match_id}...")
        url = f"{RAW_BASE}/matches/{match_id}/{match_id}_match.json"
        content = fetch_url(url)
        with open(raw_match_path, "wb") as f:
            f.write(content)
        match_data = json.loads(content.decode("utf-8"))

    # 2. Download dynamic events if available
    raw_events_path = os.path.join(raw_dir, f"{match_id}_dynamic_events.csv")
    csv_text = ""
    if os.path.exists(raw_events_path):
        with open(raw_events_path, "r", encoding="utf-8") as f:
            csv_text = f.read()
    else:
        logger.info(f"Downloading dynamic events CSV for {match_id}...")
        url = f"{RAW_BASE}/matches/{match_id}/{match_id}_dynamic_events.csv"
        try:
            content = fetch_url(url)
            with open(raw_events_path, "wb") as f:
                f.write(content)
            csv_text = content.decode("utf-8")
        except (urllib.error.URLError, OSError) as e:
            logger.warning("Could not fetch dynamic events CSV: %s", e)

    parsed_events = parse_events_csv(csv_text, match_id)

    # Extract team info
    home_team = match_data["home_team"]
    away_team = match_data["away_team"]
    home_kit = match_data.get("home_team_kit") or {}
    away_kit = match_data.get("away_team_kit") or {}

    home_sides = match_data.get("home_team_side", ["left_to_right", "right_to_left"])
    if not home_sides or len(home_sides) < 2:
        home_sides = ["left_to_right", "right_to_left"]

    # Player roster mapping
    players_meta: dict[int, dict[str, Any]] = {}
    gk_ids: list[int] = []
    for p in match_data.get("players", []):
        pid = p["id"]
        role_info = p.get("player_role") or {}
        role_name = role_info.get("name", "Player")
        is_gk = role_name.lower() == "goalkeeper"
        if is_gk:
            gk_ids.append(pid)

        players_meta[pid] = {
            "id": pid,
            "name": p.get("short_name")
            or f"{p.get('first_name', '')} {p.get('last_name', '')}".strip(),
            "number": p.get("number"),
            "role": role_name,
            "role_acronym": role_info.get("acronym", ""),
            "position_group": role_info.get("position_group", ""),
            "team_id": p.get("team_id"),
            "is_gk": is_gk,
            "goal": p.get("goal", 0),
            "yellow_card": p.get("yellow_card", 0),
            "red_card": p.get("red_card", 0),
        }

    # Match periods
    periods_data = match_data.get("match_periods", [])
    period_lookup: dict[int, dict[str, Any]] = {}
    p1_duration_frames = 0
    for p in periods_data:
        p_num = p["period"]
        p_info = {
            "period": p_num,
            "name": p.get("name", f"period_{p_num}"),
            "start_frame": p["start_frame"],
            "end_frame": p["end_frame"],
            "duration_frames": p["duration_frames"],
            "duration_seconds": p["duration_frames"] / 10.0,
        }
        period_lookup[p_num] = p_info
        if p_num == 1:
            p1_duration_frames = p["duration_frames"]

    p1_offset_sec = p1_duration_frames / 10.0

    # Stream tracking extrapolated JSONL
    tracking_url = f"{LFS_BASE}/matches/{match_id}/{match_id}_tracking_extrapolated.jsonl"
    raw_tracking_path = os.path.join(raw_dir, f"{match_id}_tracking_extrapolated.jsonl")

    logger.info(f"Opening tracking data for match {match_id}...")
    if os.path.exists(raw_tracking_path) and os.path.getsize(raw_tracking_path) > 1000:
        file_stream = open(raw_tracking_path, "r", encoding="utf-8")  # noqa: SIM115
    else:
        req = urllib.request.Request(tracking_url, headers={"User-Agent": "Mozilla/5.0"})
        file_stream = io.TextIOWrapper(urllib.request.urlopen(req, timeout=120), encoding="utf-8")

    current_chunk_idx = 0
    chunk_frames: list[dict[str, Any]] = []
    chunk_shapes: list[dict[str, Any]] = []
    total_frames_processed = 0
    chunk_count = 0

    try:
        for line in file_stream:
            if not line.strip():
                continue
            try:
                frame_data = json.loads(line)
            except json.JSONDecodeError:
                continue

            period = frame_data.get("period")
            if period not in (1, 2) or period not in period_lookup:
                continue

            p_info = period_lookup[period]
            frame_num = frame_data["frame"]
            if frame_num < p_info["start_frame"] or frame_num > p_info["end_frame"]:
                continue

            # Calculate match elapsed time in seconds
            if period == 1:
                elapsed_sec = (frame_num - p_info["start_frame"]) / 10.0
            else:
                elapsed_sec = p1_offset_sec + (frame_num - p_info["start_frame"]) / 10.0

            chunk_idx = int(elapsed_sec // 60)

            # Check if chunk changed
            if chunk_idx > current_chunk_idx:
                # Flush previous chunk
                _flush_chunk(
                    match_replay_dir,
                    current_chunk_idx,
                    chunk_frames,
                    chunk_shapes,
                )
                chunk_count += 1
                if max_chunks and chunk_count >= max_chunks:
                    logger.info(f"Reached max_chunks={max_chunks}, stopping stream.")
                    break

                current_chunk_idx = chunk_idx
                chunk_frames = []
                chunk_shapes = []

            # Format frame
            ball_data = frame_data.get("ball_data")
            ball_out: list[float] | None = None
            if ball_data and ball_data.get("x") is not None and ball_data.get("y") is not None:
                bx = round(float(ball_data["x"]), 1)
                by = round(float(ball_data["y"]), 1)
                bz = round(float(ball_data.get("z") or 0.0), 1)
                ball_out = [bx, by, bz]

            raw_players = frame_data.get("player_data", [])
            players_out: list[list[Any]] = []
            players_with_team: list[dict[str, Any]] = []

            for p in raw_players:
                pid = p["player_id"]
                px = p.get("x")
                py = p.get("y")
                if px is None or py is None:
                    continue
                rx = round(float(px), 1)
                ry = round(float(py), 1)
                players_out.append([pid, rx, ry])

                p_meta = players_meta.get(pid)
                tid = p_meta["team_id"] if p_meta else None
                players_with_team.append(
                    {
                        "player_id": pid,
                        "x": rx,
                        "y": ry,
                        "team_id": tid,
                    }
                )

            chunk_frames.append(
                {
                    "t": round(elapsed_sec, 2),
                    "period": period,
                    "ball": ball_out,
                    "players": players_out,
                }
            )
            total_frames_processed += 1

            # Compute shapes at 1 Hz (every 10th frame)
            if len(chunk_frames) % 10 == 1 or len(chunk_frames) == 1:
                home_defending_side = (
                    "left" if (home_sides[period - 1] == "left_to_right") else "right"
                )
                shape = compute_frame_shapes(
                    players_data=players_with_team,
                    ball_data=ball_data,
                    home_team_id=home_team["id"],
                    away_team_id=away_team["id"],
                    home_defending_side=home_defending_side,
                    gk_player_ids=gk_ids,
                )
                chunk_shapes.append(
                    {
                        "second": round(elapsed_sec, 1),
                        **shape,
                    }
                )

        # Flush final chunk if any frames remain
        if chunk_frames:
            _flush_chunk(
                match_replay_dir,
                current_chunk_idx,
                chunk_frames,
                chunk_shapes,
            )
            chunk_count += 1

    finally:
        file_stream.close()

    total_duration_seconds = round(sum(p["duration_seconds"] for p in period_lookup.values()), 1)

    meta = {
        "match_id": match_id,
        "date_time": match_data.get("date_time"),
        "stadium": match_data.get("stadium"),
        "pitch_length": match_data.get("pitch_length", 105),
        "pitch_width": match_data.get("pitch_width", 68),
        "home_team": {
            "id": home_team["id"],
            "name": home_team.get("name"),
            "short_name": home_team.get("short_name"),
            "acronym": home_team.get("acronym"),
            "score": match_data.get("home_team_score", 0),
            "jersey_color": home_kit.get("jersey_color", "#1e40af"),
            "number_color": home_kit.get("number_color", "#ffffff"),
        },
        "away_team": {
            "id": away_team["id"],
            "name": away_team.get("name"),
            "short_name": away_team.get("short_name"),
            "acronym": away_team.get("acronym"),
            "score": match_data.get("away_team_score", 0),
            "jersey_color": away_kit.get("jersey_color", "#dc2626"),
            "number_color": away_kit.get("number_color", "#ffffff"),
        },
        "home_team_side": home_sides,
        "periods": list(period_lookup.values()),
        "total_duration_seconds": total_duration_seconds,
        "total_chunks": chunk_count,
        "fps": 10,
        "players": list(players_meta.values()),
        "events": parsed_events,
        "credit": "Tracking data: SkillCorner Open Data (MIT)",
    }

    meta_path = os.path.join(match_replay_dir, "meta.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    logger.info(
        f"Match {match_id} ingestion complete! Total chunks: {chunk_count}, "
        f"processed frames: {total_frames_processed}, meta: {meta_path}"
    )
    return meta


def _flush_chunk(
    match_replay_dir: str,
    chunk_idx: int,
    frames: list[dict[str, Any]],
    shapes: list[dict[str, Any]],
) -> None:
    """Write 60-second chunk to compressed json.gz."""
    chunk_path = os.path.join(match_replay_dir, f"chunk_{chunk_idx}.json.gz")
    t0 = chunk_idx * 60.0
    payload = {
        "chunk_index": chunk_idx,
        "t0": t0,
        "fps": 10,
        "frame_count": len(frames),
        "frames": frames,
        "shapes": shapes,
    }
    raw_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    with gzip.open(chunk_path, "wb", compresslevel=6) as f:
        f.write(raw_bytes)
    logger.debug(f"Wrote {chunk_path} ({len(raw_bytes) / 1024:.1f} KB raw, {len(frames)} frames)")


def main():
    parser = argparse.ArgumentParser(description="Ingest SkillCorner tracking data")
    parser.add_argument("--match-id", type=int, default=2017461, help="SkillCorner match ID")
    parser.add_argument(
        "--max-chunks", type=int, default=None, help="Max chunks to ingest (for testing)"
    )
    parser.add_argument(
        "--raw-dir", type=str, default="data/raw/skillcorner", help="Raw data directory"
    )
    parser.add_argument(
        "--output-dir", type=str, default="data/replay", help="Replay output directory"
    )
    args = parser.parse_args()

    ingest_match(
        match_id=args.match_id,
        raw_dir=args.raw_dir,
        output_dir=args.output_dir,
        max_chunks=args.max_chunks,
    )


if __name__ == "__main__":
    main()
