from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_admin_refresh_unauthorized():
    res = client.post("/admin/refresh")
    assert res.status_code == 401


def test_admin_refresh_invalid_token():
    res = client.post("/admin/refresh", headers={"X-Admin-Token": "bad-token"})
    assert res.status_code == 401


def test_admin_refresh_success():
    res = client.post("/admin/refresh", headers={"X-Admin-Token": "match-analytics-admin-secret"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "refresh_scheduled"
