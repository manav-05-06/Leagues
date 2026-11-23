import copy
import json
from pathlib import Path

import pytest

from app.espn.parser import parse_clock

BASE_FIXTURE_PATH = Path(__file__).parent / "fixtures" / "summary_401879246.json"


@pytest.fixture
def base_summary():
    with open(BASE_FIXTURE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def make_live_fixture(clock: str) -> dict:
    with open(BASE_FIXTURE_PATH, "r", encoding="utf-8") as f:
        summary = json.load(f)

    data = copy.deepcopy(summary)
    comp = data.get("header", {}).get("competitions", [{}])[0]
    status = comp.setdefault("status", {})
    status_type = status.setdefault("type", {})
    status_type["state"] = "in"
    status_type["name"] = "STATUS_IN_PROGRESS"
    status_type["detail"] = clock
    status["displayClock"] = clock

    target_min, target_added = parse_clock(clock)
    target_period = 2 if target_min > 45 else 1

    # Filter commentary plays up to (target_period, target_min, target_added)
    filtered_commentary = []
    for item in data.get("commentary", []):
        play = item.get("play", {})
        period = int(play.get("period", {}).get("number", 1))
        c_str = play.get("clock", {}).get("displayValue", "")
        m, a = parse_clock(c_str)
        if (period, m, a) <= (target_period, target_min, target_added):
            filtered_commentary.append(item)

    data["commentary"] = filtered_commentary

    # Score: Havertz scored at 16' (period 1)
    # Before 16': 0-0. From 16': 0-1
    arsenal_scored = (target_period, target_min, target_added) >= (1, 16, 0)
    for competitor in comp.get("competitors", []):
        if competitor.get("homeAway") == "home":
            competitor["score"] = "0"
        else:
            competitor["score"] = "1" if arsenal_scored else "0"

    return data
