import pytest

from app.models.geometry import (
    calculate_angle,
    calculate_distance,
    calculate_shot_metrics,
    espn_to_metres,
)


def test_penalty_spot_distance():
    # Penalty spot: x ≈ 89.52, y = 50.0
    dx, dy = espn_to_metres(89.5238, 50.0)
    dist = calculate_distance(dx, dy)
    assert pytest.approx(dist, rel=1e-2) == 11.0


def test_goal_line_touchline_angle():
    # Touchline at the goal line (x = 100, y = 100 -> dx = 0, dy = 34m)
    dx, dy = espn_to_metres(100.0, 100.0)
    assert dx == 0.0
    angle = calculate_angle(dx, dy)
    assert angle == 0.0


def test_center_goal_mouth_angle():
    # Shot right in front of goal at 10m: dx = 10, dy = 0
    # angle = atan2(7.32 * 10, 100 - 3.66^2) ≈ atan2(73.2, 86.6044) ≈ 0.701 rad (≈ 40.2 deg)
    dist, angle = calculate_shot_metrics(100.0 - (10.0 / 1.05), 50.0, source="espn")
    assert pytest.approx(dist, rel=1e-2) == 10.0
    assert angle > 0.65 and angle < 0.75
