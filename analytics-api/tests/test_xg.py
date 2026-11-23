from app.models.xg import _xg_model, calculate_xg


def test_penalty_equals_penalty_xg():
    shot = {"situation": "penalty", "distance": 11.0, "angle": 0.64}
    assert calculate_xg(shot) == _xg_model.penalty_xg


def test_closer_shot_scores_higher():
    close_shot = {
        "distance": 8.0,
        "angle": 0.8,
        "body_part": "foot",
        "situation": "open_play",
    }
    far_shot = {
        "distance": 25.0,
        "angle": 0.3,
        "body_part": "foot",
        "situation": "open_play",
    }
    assert calculate_xg(close_shot) > calculate_xg(far_shot)


def test_central_shot_beats_wide_shot():
    # Both from 12m away, central has larger visible goal angle than wide shot
    central_shot = {
        "distance": 12.0,
        "angle": 0.60,
        "body_part": "foot",
        "situation": "open_play",
    }
    wide_shot = {
        "distance": 12.0,
        "angle": 0.22,
        "body_part": "foot",
        "situation": "open_play",
    }
    assert calculate_xg(central_shot) > calculate_xg(wide_shot)


def test_header_lower_than_foot_from_same_spot():
    foot_shot = {
        "distance": 10.0,
        "angle": 0.65,
        "body_part": "right_foot",
        "situation": "open_play",
    }
    head_shot = {
        "distance": 10.0,
        "angle": 0.65,
        "body_part": "header",
        "situation": "open_play",
    }
    assert calculate_xg(foot_shot) > calculate_xg(head_shot)
