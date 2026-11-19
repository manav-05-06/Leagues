from typing import Any

import numpy as np


def calculate_momentum_wave(
    shots: list[Any],
    events: list[Any],
    home_team_id: str,
    away_team_id: str,
    max_minute: int = 90,
    window_size: int = 5,
) -> list[dict[str, Any]]:
    """
    Computes a rolling 5-minute attacking momentum wave.
    Formula per minute:
      shot xG + 0.03 per corner + 0.01 per foul won in attacking third (x > 66).
    Home is represented as positive, Away as negative.
    """
    end_minute = max(max_minute, 90)
    home_raw = np.zeros(end_minute + 1, dtype=float)
    away_raw = np.zeros(end_minute + 1, dtype=float)

    # 1. Tally shot xG per minute
    for shot in shots:
        m = getattr(shot, "minute", 0)
        if 0 <= m <= end_minute:
            xg = float(getattr(shot, "xg", 0.1))
            t_id = str(getattr(shot, "team_id", ""))
            if t_id == home_team_id:
                home_raw[m] += xg
            elif t_id == away_team_id:
                away_raw[m] += xg

    # 2. Tally corners (0.03) and attacking-third fouls won (0.01)
    for ev in events:
        m = getattr(ev, "minute", 0)
        if 0 <= m <= end_minute:
            t_id = str(getattr(ev, "team_id", ""))
            e_type = str(getattr(ev, "type", "")).lower()
            x = getattr(ev, "x", None)

            is_corner = "corner" in e_type
            is_att_foul = "foul" in e_type and x is not None and float(x) > 66.0

            val = 0.03 if is_corner else (0.01 if is_att_foul else 0.0)
            if val > 0.0:
                if t_id == home_team_id:
                    home_raw[m] += val
                elif t_id == away_team_id:
                    away_raw[m] += val

    # 3. Apply rolling window smoothing
    # Kernel weights (triangular window of width window_size)
    kernel = np.bartlett(window_size)
    if np.sum(kernel) > 0:
        kernel = kernel / np.sum(kernel)
    else:
        kernel = np.ones(window_size) / window_size

    # Pad array for convolution
    pad_h = np.pad(home_raw, (window_size // 2, window_size // 2), mode="edge")
    pad_a = np.pad(away_raw, (window_size // 2, window_size // 2), mode="edge")

    smooth_h = np.convolve(pad_h, kernel, mode="valid")[: end_minute + 1]
    smooth_a = np.convolve(pad_a, kernel, mode="valid")[: end_minute + 1]

    # Home positive, Away negative
    differential = smooth_h - smooth_a

    momentum_points = []
    for m in range(1, end_minute + 1):
        momentum_points.append(
            {
                "minute": m,
                "momentum": round(float(differential[m]), 3),
                "home": round(float(smooth_h[m]), 3),
                "away": round(float(smooth_a[m]), 3),
            }
        )

    return momentum_points
