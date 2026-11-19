import re
import unicodedata
from typing import Any

from pydantic import BaseModel, Field

from app.models.geometry import calculate_shot_metrics

SHOT_PLAY_TYPES = {
    "Goal",
    "Shot On Target",
    "Shot Off Target",
    "Shot Blocked",
    "Shot Hit Woodwork",
}

KEY_EVENT_PLAY_TYPES = {
    "Foul": "foul",
    "Corner Awarded": "corner",
    "Offside": "offside",
    "Yellow Card": "yellow_card",
    "Red Card": "red_card",
    "Substitution": "substitution",
}


def normalize_text(text: str | None) -> str:
    if not text:
        return ""
    norm = unicodedata.normalize("NFKD", text).encode("ASCII", "ignore").decode("utf-8")
    return norm.strip().lower()


class Shot(BaseModel):
    id: str
    period: int
    minute: int
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
    home_team: dict[str, Any] = Field(default_factory=dict)
    away_team: dict[str, Any] = Field(default_factory=dict)
    shots: list[Shot] = Field(default_factory=list)
    events: list[Event] = Field(default_factory=list)


def extract_shot_features(text: str) -> dict[str, Any]:
    low = text.lower()

    # Body part
    if "header" in low or "headed" in low:
        body_part = "header"
    elif "left footed" in low or "left foot" in low:
        body_part = "left_foot"
    elif "right footed" in low or "right foot" in low:
        body_part = "right_foot"
    else:
        body_part = "foot"

    # Situation
    if "penalty" in low or "penalty kick" in low:
        situation = "penalty"
    elif "direct free kick" in low or "free kick" in low:
        situation = "direct_free_kick"
    elif "following a corner" in low or "from a corner" in low:
        situation = "from_corner"
    elif "following a set piece" in low or "from a set piece" in low:
        situation = "set_piece"
    elif "fast break" in low:
        situation = "fast_break"
    else:
        situation = "open_play"

    # Height
    if "top" in low:
        height = "top"
    elif "bottom" in low:
        height = "bottom"
    elif "high" in low:
        height = "high"
    else:
        height = None

    assisted = "assisted by" in low

    return {
        "body_part": body_part,
        "situation": situation,
        "height": height,
        "assisted": assisted,
    }


def map_shot_outcome(play_type_text: str) -> str:
    if play_type_text == "Goal":
        return "goal"
    if play_type_text == "Shot On Target":
        return "saved"
    if play_type_text == "Shot Off Target":
        return "off_target"
    if play_type_text == "Shot Blocked":
        return "blocked"
    if play_type_text == "Shot Hit Woodwork":
        return "woodwork"
    return "saved"


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
    current_minute = int(
        competition.get("status", {}).get("displayClock", "0'").replace("'", "") or 0
    )
    event_id = str(header.get("id") or summary.get("id", "0"))

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
        }
        if comp.get("homeAway") == "home":
            home_team = t_data
        else:
            away_team = t_data

    shots: list[Shot] = []
    events: list[Event] = []
    seen_play_ids: set[str] = set()

    for comment in summary.get("commentary", []):
        play = comment.get("play", {})
        play_id = str(play.get("id", ""))
        if not play_id or play_id in seen_play_ids:
            continue

        play_type_obj = play.get("type", {})
        play_type_text = play_type_obj.get("text", "")
        play_text = play.get("text", "")
        clock_str = play.get("clock", {}).get("displayValue", "0'")
        # Parse minute: "16'" or "45'+1'" -> 16 or 45
        minute_match = re.search(r"(\d+)", clock_str)
        minute = int(minute_match.group(1)) if minute_match else 0
        period = int(play.get("period", {}).get("number", 1))

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
                # Fallback to home/away matching
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

        # Case 1: Shot
        if play_type_text in SHOT_PLAY_TYPES:
            # Exclude own goals
            if "own goal" in play_text.lower():
                continue

            x = play.get("fieldPositionX")
            y = play.get("fieldPositionY")
            if x is not None and y is not None:
                x = float(x)
                y = float(y)
                features = extract_shot_features(play_text)
                dist, ang = calculate_shot_metrics(x, y, source="espn")
                outcome = map_shot_outcome(play_type_text)

                shot = Shot(
                    id=play_id,
                    period=period,
                    minute=minute,
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

        # Case 2: Other Key Events (Foul, Corner, Offside, Card)
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

    return ParsedMatch(
        event_id=event_id,
        status=status_state,
        status_detail=status_detail,
        minute=current_minute,
        home_team=home_team,
        away_team=away_team,
        shots=shots,
        events=events,
    )
