import json
from pathlib import Path

import pytest
import respx
from httpx import ASGITransport, AsyncClient

from app.main import app

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "summary_401879246.json"


@pytest.fixture
def mock_summary():
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.mark.asyncio
async def test_get_match_analytics_success(mock_summary):
    event_id = "401879246"
    target_url = (
        f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={event_id}"
    )

    with respx.mock(assert_all_called=False) as respx_mock:
        respx_mock.get(target_url).respond(200, json=mock_summary)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/matches/{event_id}/analytics")

    assert response.status_code == 200
    data = response.json()

    assert "match" in data
    assert data["match"]["id"] == event_id
    assert data["match"]["home"]["name"] == "Liverpool"
    assert data["match"]["away"]["name"] == "Arsenal"

    assert "shots" in data
    assert len(data["shots"]) == 27

    # Verify Havertz goal shot
    goal_shot = next(s for s in data["shots"] if s["outcome"] == "goal")
    assert goal_shot["player_name"] == "Kai Havertz"
    assert goal_shot["xg"] > 0.3  # Close header/shot in 6yd box

    assert "xg" in data
    xg = data["xg"]
    assert xg["home"] > 0
    assert xg["away"] > 0
    assert len(xg["timeline"]) >= 2
    assert xg["timeline"][0]["minute"] == 0
    assert xg["timeline"][-1]["minute"] >= 90

    assert "events" in data
    assert len(data["events"]) > 0

    assert "win_prob" in data
    assert 0.0 <= data["win_prob"]["home"] <= 1.0
    assert 0.0 <= data["win_prob"]["away"] <= 1.0
    assert len(data["win_prob"]["history"]) >= 90

    assert "momentum" in data
    assert len(data["momentum"]) >= 90


@pytest.mark.asyncio
async def test_get_match_analytics_upstream_failure():
    event_id = "999999999"
    target_url = (
        f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={event_id}"
    )

    with respx.mock(assert_all_called=False) as respx_mock:
        respx_mock.get(target_url).respond(500)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(f"/matches/{event_id}/analytics")

    assert response.status_code == 502
