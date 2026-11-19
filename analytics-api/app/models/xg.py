import json
import math
from pathlib import Path
from typing import Any

ARTIFACT_PATH = Path(__file__).parent.parent.parent / "artifacts" / "xg_model.json"

# Calibrated baseline weights if model artifact hasn't been generated yet
DEFAULT_CONFIG = {
    "features": [
        "distance",
        "angle",
        "distance_x_angle",
        "header",
        "direct_free_kick",
        "from_corner",
        "fast_break",
        "assisted",
    ],
    # Distance has negative effect, angle has positive effect, header has negative effect vs foot
    "coefficients": [-0.105, 0.850, -0.015, -0.650, -0.200, -0.150, 0.350, 0.250],
    "intercept": -1.150,
    "penalty_xg": 0.770,
}


class XGModel:
    def __init__(self):
        self.features: list[str] = DEFAULT_CONFIG["features"]
        self.coefficients: list[float] = DEFAULT_CONFIG["coefficients"]
        self.intercept: float = DEFAULT_CONFIG["intercept"]
        self.penalty_xg: float = DEFAULT_CONFIG["penalty_xg"]
        self.load()

    def load(self) -> None:
        if ARTIFACT_PATH.exists():
            try:
                with open(ARTIFACT_PATH) as f:
                    data = json.load(f)
                    self.features = data.get("features", self.features)
                    self.coefficients = data.get("coefficients", self.coefficients)
                    self.intercept = data.get("intercept", self.intercept)
                    self.penalty_xg = data.get("penalty_xg", self.penalty_xg)
            except (OSError, json.JSONDecodeError):
                pass

    def predict_shot(self, shot_data: Any) -> float:
        """
        Compute expected goal value for a shot. Accepts a Shot model or a dict.
        """
        situation = getattr(shot_data, "situation", None) or (
            shot_data.get("situation") if isinstance(shot_data, dict) else "open_play"
        )
        if situation == "penalty":
            return round(self.penalty_xg, 4)

        # Extract features
        dist = float(
            getattr(shot_data, "distance", 0.0)
            if not isinstance(shot_data, dict)
            else shot_data.get("distance", 0.0)
        )
        ang = float(
            getattr(shot_data, "angle", 0.0)
            if not isinstance(shot_data, dict)
            else shot_data.get("angle", 0.0)
        )
        body_part = str(
            getattr(shot_data, "body_part", "foot")
            if not isinstance(shot_data, dict)
            else shot_data.get("body_part", "foot")
        )
        assisted = bool(
            getattr(shot_data, "assisted", False)
            if not isinstance(shot_data, dict)
            else shot_data.get("assisted", False)
        )

        header = 1.0 if "header" in body_part.lower() else 0.0
        dfk = 1.0 if situation == "direct_free_kick" else 0.0
        from_corner = 1.0 if situation == "from_corner" else 0.0
        fast_break = 1.0 if situation == "fast_break" else 0.0
        is_assisted = 1.0 if assisted else 0.0
        dist_x_ang = dist * ang

        feature_values = [
            dist,
            ang,
            dist_x_ang,
            header,
            dfk,
            from_corner,
            fast_break,
            is_assisted,
        ]

        # Logit calculation
        logit = self.intercept
        for w, x in zip(self.coefficients, feature_values):
            logit += w * x

        # Sigmoid: 1 / (1 + exp(-logit))
        # Prevent math overflow
        if logit < -20.0:
            prob = 0.0001
        elif logit > 20.0:
            prob = 0.9999
        else:
            prob = 1.0 / (1.0 + math.exp(-logit))

        return round(float(prob), 4)


# Shared singleton instance
_xg_model = XGModel()


def calculate_xg(shot: Any) -> float:
    return _xg_model.predict_shot(shot)
