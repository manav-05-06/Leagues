import json
import time
from pathlib import Path

import pytest
import respx
from httpx import ASGITransport, AsyncClient

from app.espn.parser import extract_shot_features, parse_clock, parse_summary
from app.main import app
from tests.conftest import make_live_fixture

FIXTURES_DIR = Path(__file__).parent / "fixtures"

SAVED_FIXTURES = [
    ("401879246", 0, 1),  # Liverpool 0 - 1 Arsenal
    ("401879242", 3, 1),  # Everton 3 - 1 Coventry
    ("401879265", 2, 1),  # Ipswich 2 - 1 Fulham
    ("401879267", 4, 1),  # Coventry 4 - 1 Newcastle
    ("401879250", 1, 1),  # Aston Villa 1 - 1 Fulham
    ("401879261", 5, 0),  # Brighton 5 - 0 Crystal Palace
    ("401878772", 0, 2),  # Sunderland 0 - 2 Brighton
    ("401878775", 5, 1),  # Chelsea 5 - 1 Bournemouth
]


def test_score_reconstruction_across_all_fixtures():
    """Score test: for every saved fixture, the score rebuilt from score_events

    equals the real official final score.
    """
    for event_id, expected_h, expected_a in SAVED_FIXTURES:
        fixture_path = FIXTURES_DIR / f"summary_{event_id}.json"
        assert fixture_path.exists(), f"Missing fixture {fixture_path}"

        with open(fixture_path, "r", encoding="utf-8") as f:
            summary = json.load(f)

        parsed = parse_summary(summary)
        actual_h = parsed.score_events[-1].home_score if parsed.score_events else 0
        actual_a = parsed.score_events[-1].away_score if parsed.score_events else 0

        assert (actual_h, actual_a) == (expected_h, expected_a), (
            f"Fixture {event_id}: Expected ({expected_h}, {expected_a}), got ({actual_h}, {actual_a})"
        )


@pytest.mark.asyncio
async def test_live_level_at_10_minutes():
    """Live test, level: take Liverpool vs Arsenal (401879246), cut at 10' with 0-0.

    Each of home, draw, away between 15% and 60%, sum to 100% (±0.5), next_goal present.
    """
    live_summary = make_live_fixture("10'")
    event_id = "401879246_live_10"
    target_url = (
        f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={event_id}"
    )

    with respx.mock(assert_all_called=False) as respx_mock:
        respx_mock.get(target_url).respond(200, json=live_summary)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get(f"/matches/{event_id}/analytics")

    assert resp.status_code == 200
    data = resp.json()

    wp = data["win_prob"]
    h, d, a = wp["home"], wp["draw"], wp["away"]

    assert 0.15 <= h <= 0.60, f"Home prob {h} not in [0.15, 0.60]"
    assert 0.15 <= d <= 0.60, f"Draw prob {d} not in [0.15, 0.60]"
    assert 0.15 <= a <= 0.60, f"Away prob {a} not in [0.15, 0.60]"
    assert abs(h + d + a - 1.0) < 0.005, f"Probabilities sum {h + d + a} does not sum to 1.0"

    assert wp["next_goal"] is not None
    assert "home" in wp["next_goal"]
    assert "away" in wp["next_goal"]
    assert "none" in wp["next_goal"]
    assert data["match"]["status"] == "in"
    assert data["match"]["minute_label"] == "10'"


@pytest.mark.asyncio
async def test_live_leading_at_30_minutes():
    """Live test, leading: Liverpool vs Arsenal cut at 30' (Arsenal 0-1 Havertz 16').

    Arsenal win chance between 45% and 85%, Liverpool > 5%, next_goal present.
    """
    live_summary = make_live_fixture("30'")
    event_id = "401879246_live_30"
    target_url = (
        f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={event_id}"
    )

    with respx.mock(assert_all_called=False) as respx_mock:
        respx_mock.get(target_url).respond(200, json=live_summary)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get(f"/matches/{event_id}/analytics")

    assert resp.status_code == 200
    data = resp.json()

    wp = data["win_prob"]
    arsenal_win = wp["away"]
    liverpool_win = wp["home"]

    assert 0.45 <= arsenal_win <= 0.85, f"Arsenal win chance {arsenal_win} not in [0.45, 0.85]"
    assert liverpool_win > 0.05, f"Liverpool win chance {liverpool_win} not > 0.05"
    assert wp["next_goal"] is not None


@pytest.mark.asyncio
async def test_stoppage_time_first_half():
    """Stoppage test: clock at 45'+2' returns HTTP 200 without raising."""
    live_summary = make_live_fixture("45'+2'")
    event_id = "401879246_stoppage_45"
    target_url = (
        f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={event_id}"
    )

    with respx.mock(assert_all_called=False) as respx_mock:
        respx_mock.get(target_url).respond(200, json=live_summary)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get(f"/matches/{event_id}/analytics")

    assert resp.status_code == 200
    data = resp.json()
    assert data["match"]["minute"] == 45
    assert data["match"]["added"] == 2
    assert data["match"]["minute_label"] == "45+2'"


@pytest.mark.asyncio
async def test_stoppage_time_second_half():
    """Stoppage test: clock at 90'+5' returns HTTP 200 without raising."""
    live_summary = make_live_fixture("90'+5'")
    event_id = "401879246_stoppage_90"
    target_url = (
        f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={event_id}"
    )

    with respx.mock(assert_all_called=False) as respx_mock:
        respx_mock.get(target_url).respond(200, json=live_summary)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get(f"/matches/{event_id}/analytics")

    assert resp.status_code == 200
    data = resp.json()
    assert data["match"]["minute"] == 90
    assert data["match"]["added"] == 5
    assert data["match"]["minute_label"] == "90+5'"


def test_clock_parser():
    assert parse_clock("45'+2'") == (45, 2)
    assert parse_clock("90'+5'") == (90, 5)
    assert parse_clock("16'") == (16, 0)
    assert parse_clock("FT") == (0, 0)
    assert parse_clock(None) == (0, 0)
    assert parse_clock("") == (0, 0)


def test_text_parser_araujo_and_christopher():
    """Text test: Araujo's 'with a headed pass' shot is recorded as right_foot.

    A shooter named Christopher does not get height 'top'.
    """
    # 1. Araujo shot text from Liverpool vs Arsenal
    araujo_text = (
        "Attempt blocked. Ronald Araújo (Liverpool) right footed shot from the centre of the box is blocked. "
        "Assisted by Virgil van Dijk with a headed pass."
    )
    features = extract_shot_features(araujo_text, "Shot Blocked")
    assert features["body_part"] == "right_foot"
    assert features["assisted"] is True

    # 2. Christopher test: name contains 'top', but shot height is not top corner
    christopher_text = "Attempt saved. Christopher Nkunku (Chelsea) right footed shot from outside the box is saved."
    features_nkunku = extract_shot_features(christopher_text, "Shot Saved")
    assert features_nkunku["height"] is None or features_nkunku["height"] != "top"

    # 3. Legitimate top corner shot
    top_corner_text = "Goal! Christopher Nkunku right footed shot to the top right corner."
    features_top = extract_shot_features(top_corner_text, "Goal")
    assert features_top["height"] == "top"


@pytest.mark.asyncio
async def test_calculation_speed_under_50ms(base_summary):
    """Speed test: the analytics response is calculated in under 50 ms on the saved fixture."""
    event_id = "401879246_speed_test"
    target_url = (
        f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={event_id}"
    )

    with respx.mock(assert_all_called=False) as respx_mock:
        respx_mock.get(target_url).respond(200, json=base_summary)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            t0 = time.perf_counter()
            resp = await client.get(f"/matches/{event_id}/analytics")
            elapsed_ms = (time.perf_counter() - t0) * 1000

    assert resp.status_code == 200
    print(f"\nResponse calculation speed: {elapsed_ms:.2f} ms")
    assert elapsed_ms < 50.0, f"Calculation took {elapsed_ms:.2f} ms (must be < 50 ms)"
