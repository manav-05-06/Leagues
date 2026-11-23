import json
from pathlib import Path

from app.espn.parser import parse_summary
from app.models.players import extract_player_statistics
from app.models.xg import calculate_xg

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "summary_401879246.json"


def test_extract_player_statistics():
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        summary_data = json.load(f)

    parsed = parse_summary(summary_data)
    for s in parsed.shots:
        s.xg = calculate_xg(s)

    all_players, rosters = extract_player_statistics(
        summary=summary_data,
        shots=parsed.shots,
        events=parsed.events,
    )

    assert len(all_players) > 20
    assert len(rosters) == 2

    # Check Liverpool & Arsenal formations
    liv_roster = next(r for r in rosters if "Liverpool" in r.team_name)
    ars_roster = next(r for r in rosters if "Arsenal" in r.team_name)

    assert liv_roster.formation == "4-2-3-1"
    assert ars_roster.formation == "4-2-3-1"
    assert len(liv_roster.starters) == 11
    assert len(ars_roster.starters) == 11

    # Check formation places are 1..11
    liv_places = {p.formation_place for p in liv_roster.starters}
    assert liv_places == set(range(1, 12))

    # Step 22 check: Havertz goal is credited to him
    havertz = next((p for p in all_players if "Havertz" in p.name), None)
    assert havertz is not None
    assert havertz.goals >= 1
    assert havertz.xg > 0.2

    # Step 22 check: Goalkeeper goals prevented
    raya = next((p for p in all_players if "Raya" in p.name), None)
    assert raya is not None
    assert raya.goals_prevented is not None
    assert isinstance(raya.goals_prevented, float)
