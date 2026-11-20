from unittest.mock import patch

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.routers.admin import _sync_refresh

client = TestClient(app)


def test_admin_refresh_disabled_when_token_unset():
    orig_token = settings.admin_token
    try:
        settings.admin_token = ""
        res = client.post("/admin/refresh", headers={"X-Admin-Token": "any-token"})
        assert res.status_code == 503
        assert "Refresh disabled" in res.json()["detail"]
    finally:
        settings.admin_token = orig_token


def test_admin_refresh_unauthorized():
    orig_token = settings.admin_token
    try:
        settings.admin_token = "secure-test-token"
        res = client.post("/admin/refresh")
        assert res.status_code == 401
    finally:
        settings.admin_token = orig_token


def test_admin_refresh_invalid_token():
    orig_token = settings.admin_token
    try:
        settings.admin_token = "secure-test-token"
        res = client.post("/admin/refresh", headers={"X-Admin-Token": "wrong-token"})
        assert res.status_code == 401
    finally:
        settings.admin_token = orig_token


def test_admin_refresh_success():
    orig_token = settings.admin_token
    try:
        settings.admin_token = "secure-test-token"
        res = client.post("/admin/refresh", headers={"X-Admin-Token": "secure-test-token"})
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "refresh_scheduled"
    finally:
        settings.admin_token = orig_token


def test_sync_refresh_execution():
    with (
        patch("training.backfill_results.run") as mock_backfill,
        patch("training.fit_ratings.run") as mock_fit,
        patch("training.backtest.run") as mock_backtest,
    ):
        _sync_refresh()
        mock_backfill.assert_called_once()
        mock_fit.assert_called_once()
        mock_backtest.assert_called_once()
