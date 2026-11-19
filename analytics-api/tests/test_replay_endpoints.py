from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_replay_matches():
    res = client.get("/replay/matches")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1

    first = data[0]
    assert "id" in first
    assert "home_team" in first
    assert "away_team" in first
    assert "total_duration_seconds" in first
    assert "credit" in first
    assert "SkillCorner" in first["credit"]


def test_get_replay_meta():
    res = client.get("/replay/2017461/meta")
    assert res.status_code == 200
    meta = res.json()
    assert meta["match_id"] == 2017461
    assert "home_team" in meta
    assert "away_team" in meta
    assert "players" in meta
    assert len(meta["players"]) > 10
    assert "periods" in meta
    assert meta["pitch_length"] == 105
    assert meta["pitch_width"] == 68


def test_get_replay_meta_404():
    res = client.get("/replay/99999999/meta")
    assert res.status_code == 404


def test_get_replay_frames_chunk_0():
    res = client.get("/replay/2017461/frames?chunk=0")
    assert res.status_code == 200
    assert "Cache-Control" in res.headers
    assert "immutable" in res.headers["Cache-Control"]

    data = res.json()
    assert data["chunk_index"] == 0
    assert data["fps"] == 10
    assert len(data["frames"]) == 600
    assert len(data["shapes"]) == 60

    # First frame checks
    frame0 = data["frames"][0]
    assert "t" in frame0
    assert "players" in frame0
    assert len(frame0["players"]) == 22

    # First shape checks
    shape0 = data["shapes"][0]
    assert "home" in shape0
    assert "away" in shape0
    assert "centroid" in shape0["home"]
    assert "defensive_line_x" in shape0["home"]


def test_get_replay_frames_with_from_param():
    res = client.get("/replay/2017461/frames?from=65.0")
    assert res.status_code == 200
    data = res.json()
    assert data["chunk_index"] == 1  # 65 // 60 = 1


def test_get_replay_frames_404():
    res = client.get("/replay/2017461/frames?chunk=99999")
    assert res.status_code == 404
