import re
import unicodedata
from typing import Any

from pydantic import BaseModel, Field

from app.models.geometry import calculate_shot_metrics

GOAL_TYPES = {
    "Goal",
    "Goal - Header",
    "Goal - Volley",
    "Goal - Free-kick",
    "Penalty - Scored",
}

SHOT_PLAY_TYPES = GOAL_TYPES | {
    "Shot On Target",
    "Shot Off Target",
    "Shot Blocked",
    "Shot Hit Woodwork",
    "Penalty - Missed",
    "Penalty - Saved",
}

KEY_EVENT_PLAY_TYPES = {
    "Foul": "foul",
    "Corner Awarded": "corner",
    "Offside": "offside",
    "Yellow Card": "yellow_card",
    "Red Card": "red_card",
    "Substitution": "substitution",
}

CLOCK_PATTERN = re.compile(r"(\d+)'?\s*(?:\+\s*(\d+))?")


def normalize_text(text: str | None) -> str:
    if not text:
        return ""
    norm = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
    return norm.strip().lower()


def parse_clock(text: str | None) -> tuple[int, int]:
    """Parse clock string like 45'+2' -> (45, 2), 16' -> (16, 0), FT -> (0, 0).

    Never raises an exception.
    """
    if not text:
        return (0, 0)
    match = CLOCK_PATTERN.search(text)
    if not match:
        return (0, 0)
    minute = int(match.group(1))
    added = int(match.group(2)) if match.group(2) else 0
    return (minute, added)


def clock_label(minute: int, added: int = 0) -> str:
    """Format clock into standard display label, e.g. 16' or 45+2'."""
    if added > 0:
        return f"{minute}+{added}'"
    return f"{minute}'"


class ScoreEvent(BaseModel):
    period: int
    minute: int
    added: int = 0
    label: str
    team_id: str
    side: str  # "home" | "away"
    player_id: str | None = None
    player_name: str
    kind: str  # "goal" | "header" | "volley" | "free_kick" | "penalty" | "own_goal"
    home_score: int
    away_score: int


class Shot(BaseModel):
    id: str
    period: int
    minute: int
    added: int = 0
    second: int = 0
    type: str
    outcome: str
    team_id: str
    team_name: str
    player_id: str | None = None
    player_name: str
    x: float
    y: float
    end_x: float | None = None
    end_y: float | None = None
    goal_y: float | None = None
    height: str | None = None
    body_part: str = "foot"
    situation: str = "open_play"
    assisted: bool = False
    text: str = ""
    distance: float = 0.0
    angle: float = 0.0
    xg: float = 0.0


class Event(BaseModel):
    id: str
    period: int
    minute: int
    added: int = 0
    second: int = 0
    type: str
    team_id: str | None = None
    team_name: str | None = None
    player_id: str | None = None
    player_name: str | None = None
    x: float | None = None
    y: float | None = None
    text: str = ""


class ParsedMatch(BaseModel):
    event_id: str
    status: str
    status_detail: str
    minute: int = 0
    added: int = 0
    minute_label: str = "0'"
    league: str = ""
    home_team: dict[str, Any] = Field(default_factory=dict)
    away_team: dict[str, Any] = Field(default_factory=dict)
    score_events: list[ScoreEvent] = Field(default_factory=list)
    shots: list[Shot] = Field(default_factory=list)
    events: list[Event] = Field(default_factory=list)


def extract_shot_features(play_text: str, play_type_text: str = "") -> dict[str, Any]:
    # 1. Split on "assisted by" to avoid assist wording corrupting shooter attributes
    parts = re.split(r"\bassisted by\b", play_text, flags=re.IGNORECASE)
    shooter_clause = parts[0]
    assisted = len(parts) > 1

    # 2. Body part: check play_type first, then shooter_clause with whole-word regex
    if play_type_text == "Goal - Header" or re.search(r"\bheader\b", shooter_clause, re.IGNORECASE):
        body_part = "header"
    elif re.search(r"\bleft footed\b", shooter_clause, re.IGNORECASE):
        body_part = "left_foot"
    elif re.search(r"\bright footed\b", shooter_clause, re.IGNORECASE):
        body_part = "right_foot"
    else:
        body_part = "foot"

    # 3. Height: whole-word regex on shooter_clause (avoids matching "Christopher")
    height_match = re.search(
        r"\b(top|bottom)\s+(left|right)\s+corner\b", shooter_clause, re.IGNORECASE
    )
    if height_match:
        height = height_match.group(1).lower()
    elif re.search(r"\btoo high\b", shooter_clause, re.IGNORECASE):
        height = "high"
    elif re.search(r"\bcentre of the goal\b", shooter_clause, re.IGNORECASE):
        height = "middle"
    elif re.search(r"\bhigh\b", shooter_clause, re.IGNORECASE):
        height = "high"
    else:
        height = None

    # 4. Situation: check play_type first, then full text with whole-word regex
    full_low = play_text.lower()
    if play_type_text == "Goal - Free-kick":
        situation = "direct_free_kick"
    elif play_type_text in ("Penalty - Scored", "Penalty - Missed", "Penalty - Saved"):
        situation = "penalty"
    elif re.search(r"\bfollowing a corner\b|\bfrom a corner\b", full_low):
        situation = "from_corner"
    elif re.search(r"\bfast break\b", full_low):
        situation = "fast_break"
    elif re.search(r"\bdirect free kick\b|\bfrom a free kick\b", full_low):
        situation = "direct_free_kick"
    elif re.search(r"\bfollowing a set piece\b|\bfrom a set piece\b", full_low):
        situation = "set_piece"
    elif re.search(r"\bpenalty\b|\bpenalty kick\b", full_low):
        situation = "penalty"
    else:
        situation = "open_play"

    return {
        "body_part": body_part,
        "situation": situation,
        "height": height,
        "assisted": assisted,
    }


def map_shot_outcome(play_type_text: str, play_text: str = "") -> str:
    if play_type_text in GOAL_TYPES:
        return "goal"
    if play_type_text in ("Shot On Target", "Penalty - Saved"):
        return "saved"
    if play_type_text == "Shot Off Target":
        return "off_target"
    if play_type_text == "Shot Blocked":
        return "blocked"
    if play_type_text == "Shot Hit Woodwork":
        return "woodwork"
    if play_type_text == "Penalty - Missed":
        low = play_text.lower()
        if any(w in low for w in ("bar", "post", "woodwork")):
            return "woodwork"
        return "off_target"
    return "saved"


def map_goal_kind(play_type_text: str) -> str:
    if play_type_text == "Goal - Header":
        return "header"
    if play_type_text == "Goal - Volley":
        return "volley"
    if play_type_text == "Goal - Free-kick":
        return "free_kick"
    if play_type_text == "Penalty - Scored":
        return "penalty"
    if play_type_text == "Own Goal":
        return "own_goal"
    return "goal"


def build_lookups(summary: dict[str, Any]):
    team_name_to_info: dict[str, tuple[str, str]] = {}
    roster_player_lookup: dict[str, tuple[str, str, str]] = {}
    last_name_lookup: dict[str, tuple[str, str, str]] = {}
    last_name_counts: dict[str, int] = {}

    # Team lookups from header
    competitions = summary.get("header", {}).get("competitions", [])
    if competitions:
        for competitor in competitions[0].get("competitors", []):
            team_obj = competitor.get("team", {})
            tid = str(team_obj.get("id", ""))
            tname = team_obj.get("displayName") or team_obj.get("name") or "Unknown"
            if tid:
                for field_name in ["displayName", "name", "shortDisplayName", "abbreviation"]:
                    val = team_obj.get(field_name)
                    if val:
                        team_name_to_info[normalize_text(val)] = (tid, tname)

    # Team lookups from boxscore
    for team_entry in summary.get("boxscore", {}).get("teams", []):
        team_obj = team_entry.get("team", {})
        tid = str(team_obj.get("id", ""))
        tname = team_obj.get("displayName") or team_obj.get("name") or "Unknown"
        if tid:
            for field_name in ["displayName", "name", "shortDisplayName", "abbreviation"]:
                val = team_obj.get(field_name)
                if val:
                    team_name_to_info[normalize_text(val)] = (tid, tname)

    # Roster athlete lookups
    for roster_group in summary.get("rosters", []):
        team_id = str(roster_group.get("team", {}).get("id", ""))
        for athlete_entry in roster_group.get("roster", []):
            athlete = athlete_entry.get("athlete", {})
            pid = str(athlete.get("id", ""))
            disp_name = athlete.get("displayName") or athlete.get("fullName") or ""
            if not pid or not disp_name:
                continue

            record = (pid, disp_name, team_id)
            norm_full = normalize_text(disp_name)
            roster_player_lookup[norm_full] = record

            parts = norm_full.split()
            if len(parts) > 1:
                last = parts[-1]
                last_name_counts[last] = last_name_counts.get(last, 0) + 1
                last_name_lookup[last] = record

    for last, count in last_name_counts.items():
        if count == 1 and last not in roster_player_lookup:
            roster_player_lookup[last] = last_name_lookup[last]

    return team_name_to_info, roster_player_lookup


def parse_summary(summary: dict[str, Any]) -> ParsedMatch:
    header = summary.get("header", {})
    competitions = header.get("competitions", [{}])
    competition = competitions[0] if competitions else {}
    status_type = competition.get("status", {}).get("type", {})

    status_state = status_type.get("state", "post")
    status_detail = status_type.get("detail", "FT")
    status_name = status_type.get("name", "")
    event_id = str(header.get("id") or summary.get("id", "0"))
    league_slug = header.get("league", {}).get("slug", "")

    team_name_to_info, roster_lookup = build_lookups(summary)

    # Home and Away teams
    competitors = competition.get("competitors", [])
    home_team: dict[str, Any] = {}
    away_team: dict[str, Any] = {}

    for comp in competitors:
        t_data = {
            "id": str(comp.get("team", {}).get("id", "")),
            "name": comp.get("team", {}).get("displayName")
            or comp.get("team", {}).get("name")
            or "Team",
            "logo": comp.get("team", {}).get("logo")
            or comp.get("team", {}).get("logos", [{}])[0].get("href"),
            "score": int(comp.get("score") or 0),
            "color": f"#{comp.get('team', {}).get('color', '00ff87')}",
            "alt_color": f"#{comp.get('team', {}).get('alternateColor', 'ffffff')}",
        }
        if comp.get("homeAway") == "home":
            home_team = t_data
        else:
            away_team = t_data

    shots: list[Shot] = []
    events: list[Event] = []
    raw_scoring_plays: list[dict[str, Any]] = []
    seen_play_ids: set[str] = set()
    latest_play_clock = (0, 0)
    latest_period = 1

    for comment in summary.get("commentary", []):
        play = comment.get("play", {})
        play_id = str(play.get("id", ""))
        if not play_id or play_id in seen_play_ids:
            continue

        period = int(play.get("period", {}).get("number", 1))

        # Skip shootout plays (period 5+ or shootout flag)
        if period >= 5 or play.get("shootout") is True:
            continue

        play_type_obj = play.get("type", {})
        play_type_text = play_type_obj.get("text", "")
        play_text = play.get("text", "")
        clock_str = play.get("clock", {}).get("displayValue", "")
        minute, added = parse_clock(clock_str)

        if (period, minute, added) > (latest_period, latest_play_clock[0], latest_play_clock[1]):
            latest_period = period
            latest_play_clock = (minute, added)

        # Determine team ID & name
        raw_team_name = (
            play.get("team", {}).get("displayName") or play.get("team", {}).get("name") or ""
        )
        team_id = ""
        team_name = raw_team_name
        if raw_team_name:
            team_info = team_name_to_info.get(normalize_text(raw_team_name))
            if team_info:
                team_id, team_name = team_info
            else:
                if normalize_text(raw_team_name) in normalize_text(home_team.get("name")):
                    team_id, team_name = home_team["id"], home_team["name"]
                elif normalize_text(raw_team_name) in normalize_text(away_team.get("name")):
                    team_id, team_name = away_team["id"], away_team["name"]

        # Determine player ID & name from participants
        player_id = None
        player_name = ""
        participants = play.get("participants", [])
        if participants:
            raw_pname = participants[0].get("athlete", {}).get("displayName", "")
            player_name = raw_pname
            if raw_pname:
                p_match = roster_lookup.get(normalize_text(raw_pname))
                if not p_match:
                    parts = normalize_text(raw_pname).split()
                    if parts:
                        p_match = roster_lookup.get(parts[-1])
                if p_match:
                    player_id, player_name, p_team_id = p_match
                    if not team_id and p_team_id:
                        team_id = p_team_id

        # Case 1: Scoring Play (Goal, Goal - Header, etc., or Own Goal)
        if play_type_text in GOAL_TYPES or play_type_text == "Own Goal":
            raw_scoring_plays.append(
                {
                    "period": period,
                    "minute": minute,
                    "added": added,
                    "play_id": play_id,
                    "play_type": play_type_text,
                    "team_id": team_id,
                    "player_id": player_id,
                    "player_name": player_name or "Unknown Player",
                }
            )

        # Case 2: Shot (All shots including all 5 goal types, missed/saved penalties, but NOT own goals)
        if play_type_text in SHOT_PLAY_TYPES:
            x = play.get("fieldPositionX")
            y = play.get("fieldPositionY")
            if x is not None and y is not None:
                x = float(x)
                y = float(y)
                features = extract_shot_features(play_text, play_type_text)
                dist, ang = calculate_shot_metrics(x, y, source="espn")
                outcome = map_shot_outcome(play_type_text, play_text)

                shot = Shot(
                    id=play_id,
                    period=period,
                    minute=minute,
                    added=added,
                    type=play_type_text,
                    outcome=outcome,
                    team_id=team_id,
                    team_name=team_name,
                    player_id=player_id,
                    player_name=player_name or "Unknown Player",
                    x=x,
                    y=y,
                    end_x=float(play.get("fieldPosition2X"))
                    if play.get("fieldPosition2X") is not None
                    else None,
                    end_y=float(play.get("fieldPosition2Y"))
                    if play.get("fieldPosition2Y") is not None
                    else None,
                    goal_y=float(play.get("goalPositionY"))
                    if play.get("goalPositionY") is not None
                    else None,
                    height=features["height"],
                    body_part=features["body_part"],
                    situation=features["situation"],
                    assisted=features["assisted"],
                    text=play_text,
                    distance=round(dist, 2),
                    angle=round(ang, 3),
                )
                shots.append(shot)
                seen_play_ids.add(play_id)
                continue

        # Case 3: Other Key Events (Foul, Corner, Offside, Card, Substitution)
        if play_type_text in KEY_EVENT_PLAY_TYPES:
            event_type = KEY_EVENT_PLAY_TYPES[play_type_text]
            x_val = (
                float(play["fieldPositionX"]) if play.get("fieldPositionX") is not None else None
            )
            y_val = (
                float(play["fieldPositionY"]) if play.get("fieldPositionY") is not None else None
            )

            event = Event(
                id=play_id,
                period=period,
                minute=minute,
                added=added,
                type=event_type,
                team_id=team_id or None,
                team_name=team_name or None,
                player_id=player_id,
                player_name=player_name or None,
                x=x_val,
                y=y_val,
                text=play_text,
            )
            events.append(event)
            seen_play_ids.add(play_id)

    # Sort shots and events chronologically by (period, minute, added)
    shots.sort(key=lambda s: (s.period, s.minute, s.added))
    events.sort(key=lambda e: (e.period, e.minute, e.added))

    # Build score_events in match order with running scores
    raw_scoring_plays.sort(key=lambda p: (p["period"], p["minute"], p["added"]))
    score_events: list[ScoreEvent] = []
    running_h = 0
    running_a = 0

    for sp in raw_scoring_plays:
        side = "home" if sp["team_id"] == home_team.get("id") else "away"
        if side == "home":
            running_h += 1
        else:
            running_a += 1

        kind = map_goal_kind(sp["play_type"])
        score_events.append(
            ScoreEvent(
                period=sp["period"],
                minute=sp["minute"],
                added=sp["added"],
                label=clock_label(sp["minute"], sp["added"]),
                team_id=sp["team_id"],
                side=side,
                player_id=sp["player_id"],
                player_name=sp["player_name"],
                kind=kind,
                home_score=running_h,
                away_score=running_a,
            )
        )

    # Determine current minute and minute_label
    display_clock = competition.get("status", {}).get("displayClock")
    if status_state == "in":
        if display_clock:
            cur_minute, cur_added = parse_clock(display_clock)
        else:
            cur_minute, cur_added = latest_play_clock

        if status_name == "STATUS_HALFTIME" or "half" in status_detail.lower():
            min_label = "HT"
        else:
            min_label = clock_label(cur_minute, cur_added)
    elif status_state == "post":
        cur_minute = 90
        cur_added = latest_play_clock[1] if latest_period == 2 else 0
        min_label = "FT"
        status_detail = "FT"
    else:  # pre
        cur_minute = 0
        cur_added = 0
        min_label = ""

    return ParsedMatch(
        event_id=event_id,
        status=status_state,
        status_detail=status_detail,
        minute=cur_minute,
        added=cur_added,
        minute_label=min_label,
        league=league_slug,
        home_team=home_team,
        away_team=away_team,
        score_events=score_events,
        shots=shots,
        events=events,
    )
