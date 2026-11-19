import math


def espn_to_metres(x: float, y: float) -> tuple[float, float]:
    """
    Convert ESPN coordinates (0-100 x 0-100) to pitch offset in metres
    relative to the centre of the attacking goal line (dx = distance to goal line, dy = lateral offset).
    Pitch dimensions: 105m length x 68m width.
    """
    dx = (100.0 - float(x)) * 1.05
    dy = (float(y) - 50.0) * 0.68
    return dx, dy


def statsbomb_to_metres(x: float, y: float) -> tuple[float, float]:
    """
    Convert StatsBomb coordinates (120 x 80) to pitch offset in metres
    relative to the centre of the attacking goal line.
    StatsBomb goal line is at x=120, centre at y=40.
    """
    dx = (120.0 - float(x)) * (105.0 / 120.0)
    dy = (float(y) - 40.0) * (68.0 / 80.0)
    return dx, dy


def calculate_distance(dx: float, dy: float) -> float:
    """
    Euclidean distance from the ball to the centre of the goal line in metres.
    """
    return math.hypot(dx, dy)


def calculate_angle(dx: float, dy: float) -> float:
    """
    Calculate the visible angle of the goal mouth (in radians) from (dx, dy).
    Goal width is 7.32m (posts at dy = ±3.66m).
    """
    if dx <= 0:
        return 0.0

    numerator = 7.32 * dx
    denominator = (dx * dx) + (dy * dy) - (3.66 * 3.66)
    angle = math.atan2(numerator, denominator)
    if angle < 0:
        angle += math.pi
    return angle


def calculate_shot_metrics(x: float, y: float, source: str = "espn") -> tuple[float, float]:
    """
    Calculate (distance_m, angle_rad) from pitch coordinates.
    """
    if source == "statsbomb":
        dx, dy = statsbomb_to_metres(x, y)
    else:
        dx, dy = espn_to_metres(x, y)

    distance = calculate_distance(dx, dy)
    angle = calculate_angle(dx, dy)
    return distance, angle
