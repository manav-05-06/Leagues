"""Team shape measurements for tactical tracking data.

Computes convex hull, centroid, defensive line depth, team dimensions,
and pressing intensity per team and second.
"""

from collections.abc import Sequence
from typing import Any

import numpy as np
from scipy.spatial import ConvexHull, QhullError


def compute_team_shape(
    players: Sequence[tuple[float, float]],
    goalkeeper: tuple[float, float] | None = None,
    ball: tuple[float, float] | None = None,
    defending_side: str = "left",  # 'left' (defending x < 0) or 'right' (defending x > 0)
    pressing_radius: float = 5.0,
) -> dict[str, Any] | None:
    """Compute shape metrics for a single team.

    Args:
        players: (x, y) coordinates of outfield players.
        goalkeeper: Optional (x, y) coordinate of goalkeeper.
        ball: Optional (x, y) coordinate of the ball.
        defending_side: 'left' if defending negative x (left-to-right attack),
                        'right' if defending positive x (right-to-left attack).
        pressing_radius: Distance in metres to consider a player pressing the ball.

    Returns:
        Dict with centroid, hull, defensive_line_x, length, width, pressing.
    """
    if not players:
        return None

    pts = np.array(players, dtype=np.float64)
    n = len(pts)

    # 1. Centroid (centre of mass of outfield players)
    cx = float(np.mean(pts[:, 0]))
    cy = float(np.mean(pts[:, 1]))

    # 2. Team length and width
    team_length = float(np.ptp(pts[:, 0]))
    team_width = float(np.ptp(pts[:, 1]))

    # 3. Convex hull (outer perimeter of outfield players)
    hull_pts: list[list[float]] = []
    if n >= 3:
        try:
            hull = ConvexHull(pts)
            # Order vertices around hull
            hull_pts = [
                [round(float(pts[v, 0]), 1), round(float(pts[v, 1]), 1)] for v in hull.vertices
            ]
        except QhullError:
            # Collinear or degenerate points: use simple bounding outline
            sorted_x = np.sort(pts[:, 0])
            sorted_y = np.sort(pts[:, 1])
            hull_pts = [
                [round(float(sorted_x[0]), 1), round(float(sorted_y[0]), 1)],
                [round(float(sorted_x[-1]), 1), round(float(sorted_y[0]), 1)],
                [round(float(sorted_x[-1]), 1), round(float(sorted_y[-1]), 1)],
                [round(float(sorted_x[0]), 1), round(float(sorted_y[-1]), 1)],
            ]
    elif n > 0:
        hull_pts = [[round(float(p[0]), 1), round(float(p[1]), 1)] for p in pts]

    # 4. Defensive line: average x of the 4 deepest outfield players
    # When defending left (x = -52.5), deepest means smallest x
    # When defending right (x = +52.5), deepest means largest x
    xs = pts[:, 0]
    if defending_side == "left":
        deepest_xs = np.sort(xs)[: min(4, n)]
    else:
        deepest_xs = np.sort(xs)[::-1][: min(4, n)]
    defensive_line_x = float(np.mean(deepest_xs)) if len(deepest_xs) > 0 else cx

    # 5. Pressing: count players (including goalkeeper if close) within pressing_radius of ball
    pressing_count = 0
    if ball is not None and not (np.isnan(ball[0]) or np.isnan(ball[1])):
        bx, by = ball[0], ball[1]
        all_pts = pts
        if goalkeeper is not None:
            all_pts = np.vstack([pts, [goalkeeper[0], goalkeeper[1]]])
        dists = np.sqrt((all_pts[:, 0] - bx) ** 2 + (all_pts[:, 1] - by) ** 2)
        pressing_count = int(np.sum(dists <= pressing_radius))

    return {
        "centroid": [round(cx, 1), round(cy, 1)],
        "hull": hull_pts,
        "defensive_line_x": round(defensive_line_x, 1),
        "length": round(team_length, 1),
        "width": round(team_width, 1),
        "pressing": pressing_count,
    }


def compute_frame_shapes(
    players_data: list[dict[str, Any]],
    ball_data: dict[str, Any] | None,
    home_team_id: int,
    away_team_id: int,
    home_defending_side: str,  # 'left' or 'right'
    gk_player_ids: Sequence[int] = (),
) -> dict[str, Any]:
    """Compute shape for both teams for a single tracking frame.

    Args:
        players_data: List of dicts or tuples containing {player_id, x, y, team_id}.
        ball_data: Dict with {x, y, z} or None.
        home_team_id: ID of home team.
        away_team_id: ID of away team.
        home_defending_side: 'left' or 'right' for home team.
        gk_player_ids: Sequence of goalkeeper player IDs.

    Returns:
        Dict with 'home' and 'away' team shape metrics.
    """
    home_outfield: list[tuple[float, float]] = []
    away_outfield: list[tuple[float, float]] = []
    home_gk: tuple[float, float] | None = None
    away_gk: tuple[float, float] | None = None

    gk_set = set(gk_player_ids)
    away_defending_side = "right" if home_defending_side == "left" else "left"

    for p in players_data:
        # p can be dict or tuple
        if isinstance(p, dict):
            pid = p.get("player_id") or p.get("id")
            tid = p.get("team_id")
            x = p.get("x")
            y = p.get("y")
        elif isinstance(p, (list, tuple)):
            # [player_id, x, y, team_id] or [player_id, x, y]
            pid = p[0]
            x = p[1]
            y = p[2]
            tid = p[3] if len(p) > 3 else None
        else:
            continue

        if x is None or y is None:
            continue

        coord = (float(x), float(y))
        is_gk = pid in gk_set

        if tid == home_team_id:
            if is_gk:
                home_gk = coord
            else:
                home_outfield.append(coord)
        elif tid == away_team_id:
            if is_gk:
                away_gk = coord
            else:
                away_outfield.append(coord)

    ball_coord: tuple[float, float] | None = None
    if ball_data and ball_data.get("x") is not None and ball_data.get("y") is not None:
        ball_coord = (float(ball_data["x"]), float(ball_data["y"]))

    home_shape = compute_team_shape(
        players=home_outfield,
        goalkeeper=home_gk,
        ball=ball_coord,
        defending_side=home_defending_side,
    )
    away_shape = compute_team_shape(
        players=away_outfield,
        goalkeeper=away_gk,
        ball=ball_coord,
        defending_side=away_defending_side,
    )

    return {
        "home": home_shape,
        "away": away_shape,
    }
