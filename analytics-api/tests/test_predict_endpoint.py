import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_predict_prematch_endpoint_by_names():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/predict/prematch", params={"league": "eng.1", "home": "Arsenal", "away": "Chelsea"}
        )

    assert response.status_code == 200
    data = response.json()

    assert data["league"] == "eng.1"
    assert "Arsenal" in data["home_name"]
    assert "Chelsea" in data["away_name"]

    # Probabilities
    wp = data["win_probability"]
    assert 0.0 <= wp["home"] <= 1.0
    assert 0.0 <= wp["draw"] <= 1.0
    assert 0.0 <= wp["away"] <= 1.0
    assert round(wp["home"] + wp["draw"] + wp["away"], 2) == 1.0

    # Top scores
    assert len(data["top_scores"]) == 5
    assert all("score" in s and "prob" in s for s in data["top_scores"])

    # Score grid 7x7
    assert len(data["score_grid"]) == 7
    assert len(data["score_grid"][0]) == 7


@pytest.mark.asyncio
async def test_predict_prematch_not_found_league():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/predict/prematch", params={"league": "invalid_league_xyz", "home": "A", "away": "B"}
        )

    assert response.status_code == 404
