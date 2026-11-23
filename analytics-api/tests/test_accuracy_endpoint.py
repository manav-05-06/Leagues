import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_get_model_accuracy_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # All leagues
        res_all = await client.get("/models/accuracy?league=all")
        assert res_all.status_code == 200
        data_all = res_all.json()
        assert "eng.1" in data_all

        # Single league
        res_eng = await client.get("/models/accuracy?league=eng.1")
        assert res_eng.status_code == 200
        data_eng = res_eng.json()
        assert data_eng["league"] == "eng.1"
        assert data_eng["rps_beats_base_rate"] is True
        assert "calibration" in data_eng


@pytest.mark.asyncio
async def test_get_model_accuracy_not_found():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/models/accuracy?league=unknown_xyz")
        assert res.status_code == 404
