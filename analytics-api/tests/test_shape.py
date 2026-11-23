import numpy as np

from app.models.shape import compute_frame_shapes, compute_team_shape


def test_compute_team_shape_basic():
    # 10 outfield players defending left (x in -40 to 0)
    outfield = [
        (-30.0, -10.0),
        (-32.0, 0.0),
        (-31.0, 10.0),
        (-28.0, 20.0),  # back 4
        (-15.0, -12.0),
        (-14.0, 0.0),
        (-16.0, 12.0),  # mid 3
        (0.0, -15.0),
        (5.0, 0.0),
        (2.0, 15.0),  # fwd 3
    ]
    gk = (-48.0, 0.0)
    ball = (-32.0, 1.0)  # ball right next to CB (-32, 0) and GK is far

    shape = compute_team_shape(
        players=outfield, goalkeeper=gk, ball=ball, defending_side="left", pressing_radius=5.0
    )

    assert shape is not None
    assert len(shape["hull"]) >= 3
    # Check centroid
    expected_cx = round(float(np.mean([p[0] for p in outfield])), 1)
    expected_cy = round(float(np.mean([p[1] for p in outfield])), 1)
    assert shape["centroid"] == [expected_cx, expected_cy]

    # Length and width
    assert shape["length"] == round(5.0 - (-32.0), 1)  # 37.0
    assert shape["width"] == round(20.0 - (-15.0), 1)  # 35.0

    # Defensive line when defending left: deepest 4 are -32, -31, -30, -28 -> avg = -30.25 -> -30.2 or -30.3
    assert -31.0 <= shape["defensive_line_x"] <= -29.5

    # Pressing: (-32, 0) is at dist 1.0 (< 5m). Others are far.
    assert shape["pressing"] == 1


def test_defensive_line_drops_when_defending_deep():
    # Normal high line
    high_line = [(-15.0, -10.0), (-14.0, 0.0), (-15.0, 10.0), (-13.0, 20.0)]
    shape_high = compute_team_shape(high_line, defending_side="left")

    # Deep line (pushed back towards x = -50)
    deep_line = [(-40.0, -10.0), (-42.0, 0.0), (-41.0, 10.0), (-38.0, 20.0)]
    shape_deep = compute_team_shape(deep_line, defending_side="left")

    assert shape_deep["defensive_line_x"] < shape_high["defensive_line_x"]


def test_defending_right_side():
    # Team defending positive x (right goal at x=+52.5)
    outfield = [
        (30.0, -10.0),
        (32.0, 0.0),
        (31.0, 10.0),
        (28.0, 20.0),  # back 4 closest to +52.5
        (15.0, -12.0),
        (14.0, 0.0),
        (16.0, 12.0),
        (-5.0, -15.0),
        (-2.0, 0.0),
        (-3.0, 15.0),
    ]
    shape = compute_team_shape(outfield, defending_side="right")
    # Deepest 4 closest to right goal are 32, 31, 30, 28 -> avg = 30.25 -> 30.2 or 30.3
    assert 29.5 <= shape["defensive_line_x"] <= 31.0


def test_pressing_count_rises_near_cluster():
    # Multiple players crowding the ball
    players = [(10.0, 10.0), (11.0, 11.0), (12.0, 9.0), (30.0, 0.0)]
    ball_near = (10.5, 10.5)
    shape_cluster = compute_team_shape(players, ball=ball_near, pressing_radius=5.0)
    assert shape_cluster["pressing"] == 3

    ball_far = (-40.0, -20.0)
    shape_far = compute_team_shape(players, ball=ball_far, pressing_radius=5.0)
    assert shape_far["pressing"] == 0


def test_compute_frame_shapes():
    players_data = [
        {"player_id": 1, "team_id": 100, "x": -20.0, "y": 0.0},
        {"player_id": 2, "team_id": 100, "x": -25.0, "y": 10.0},
        {"player_id": 3, "team_id": 100, "x": -22.0, "y": -10.0},
        {"player_id": 4, "team_id": 100, "x": -45.0, "y": 0.0},  # GK
        {"player_id": 11, "team_id": 200, "x": 10.0, "y": 5.0},
        {"player_id": 12, "team_id": 200, "x": 15.0, "y": -5.0},
        {"player_id": 13, "team_id": 200, "x": 20.0, "y": 0.0},
        {"player_id": 14, "team_id": 200, "x": 48.0, "y": 0.0},  # GK
    ]
    ball_data = {"x": -21.0, "y": 1.0, "z": 0.0}

    shapes = compute_frame_shapes(
        players_data=players_data,
        ball_data=ball_data,
        home_team_id=100,
        away_team_id=200,
        home_defending_side="left",
        gk_player_ids=[4, 14],
    )

    assert shapes["home"] is not None
    assert shapes["away"] is not None
    assert shapes["home"]["pressing"] >= 1
