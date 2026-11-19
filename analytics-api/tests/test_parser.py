import json
from pathlib import Path

from app.espn.parser import parse_summary

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "summary_401879246.json"


def test_parse_summary_shots_and_events():
    with open(FIXTURE_PATH) as f:
        summary_data = json.load(f)

    parsed = parse_summary(summary_data)

    # 1. 27 shots found
    assert len(parsed.shots) == 27

    # 2. Exactly 1 goal in this fixture (Kai Havertz)
    goals = [s for s in parsed.shots if s.type == "Goal"]
    assert len(goals) == 1
    havertz_goal = goals[0]

    assert havertz_goal.player_name == "Kai Havertz"
    assert havertz_goal.x == 96.3
    assert havertz_goal.y == 55.5
    assert havertz_goal.body_part == "left_foot"
    assert havertz_goal.assisted is True
    assert havertz_goal.team_name == "Arsenal"

    # 3. Every shot has a team_id
    for shot in parsed.shots:
        assert shot.team_id != "", f"Shot {shot.id} missing team_id"

    # 4. At least 90% have a player_id
    shots_with_player_id = [s for s in parsed.shots if s.player_id is not None]
    coverage = len(shots_with_player_id) / len(parsed.shots)
    assert coverage >= 0.90, f"Coverage was only {coverage:.2%}"

    # 5. Events extracted
    assert len(parsed.events) > 50
    corners = [e for e in parsed.events if e.type == "corner"]
    assert len(corners) >= 10
