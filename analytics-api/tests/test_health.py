from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_get():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_health_head_for_uptime_monitors():
    res = client.head("/health")
    assert res.status_code == 200
    assert res.content == b""
