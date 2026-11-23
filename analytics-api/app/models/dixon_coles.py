import json
import math
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
from scipy.optimize import minimize
from scipy.stats import poisson

ARTIFACTS_DIR = Path(__file__).parent.parent.parent / "artifacts"


def tau(x: int, y: int, lambda_h: float, lambda_a: float, rho: float) -> float:
    """
    Dixon-Coles low-score adjustment factor tau(x, y).
    """
    if x == 0 and y == 0:
        val = 1.0 - lambda_h * lambda_a * rho
    elif x == 0 and y == 1:
        val = 1.0 + lambda_h * rho
    elif x == 1 and y == 0:
        val = 1.0 + lambda_a * rho
    elif x == 1 and y == 1:
        val = 1.0 - rho
    else:
        val = 1.0
    return max(0.0001, val)


class DixonColesModel:
    def __init__(self, league: str = "all", xi: float = 0.0019):
        self.league = league
        self.xi = xi  # Time-decay rate (half-life ~ 365 days)
        self.teams: list[str] = []
        self.team_indices: dict[str, int] = {}
        self.team_names: dict[str, str] = {}
        self.attack: np.ndarray = np.array([])
        self.defence: np.ndarray = np.array([])
        self.home_adv: float = 0.25
        self.rho: float = -0.05
        self.shrink_k: float = 0.0
        self.base_rates: dict[str, float] = {}
        self.last_trained: str | None = None

    def fit(self, matches: list[dict[str, Any]]) -> "DixonColesModel":
        if not matches:
            raise ValueError("No matches provided to fit Dixon-Coles model.")

        # Identify all teams
        unique_teams = sorted(
            {str(m["home_id"]) for m in matches} | {str(m["away_id"]) for m in matches}
        )
        n_teams = len(unique_teams)
        if n_teams < 2:
            raise ValueError("At least 2 teams required to fit model.")

        self.teams = unique_teams
        self.team_indices = {t: i for i, t in enumerate(self.teams)}
        for m in matches:
            self.team_names[str(m["home_id"])] = str(m.get("home_name", m["home_id"]))
            self.team_names[str(m["away_id"])] = str(m.get("away_name", m["away_id"]))

        # Reference date for time decay: max match date
        dates = []
        for m in matches:
            d_str = m["date"]
            try:
                dt = datetime.fromisoformat(d_str)
            except (ValueError, TypeError):
                dt = datetime.now(UTC)
            dates.append(dt)

        max_date = max(dates) if dates else datetime.now(UTC)

        # Prepare arrays for fast likelihood calculation
        home_idxs = np.array([self.team_indices[str(m["home_id"])] for m in matches], dtype=int)
        away_idxs = np.array([self.team_indices[str(m["away_id"])] for m in matches], dtype=int)
        home_goals = np.array([int(m["home_goals"]) for m in matches], dtype=int)
        away_goals = np.array([int(m["away_goals"]) for m in matches], dtype=int)

        # Time decay weights: w_k = exp(-xi * days_ago)
        days_ago = np.array(
            [(max_date - dt).total_seconds() / 86400.0 for dt in dates], dtype=float
        )
        weights = np.exp(-self.xi * np.maximum(0.0, days_ago))

        # Initial parameters:
        # alpha[0..n-2], beta[0..n-1], home_adv (1), rho (1)
        # alpha[n-1] is constrained as -sum(alpha[0..n-2]) to enforce sum(alpha) = 0
        init_params = np.zeros((n_teams - 1) + n_teams + 2)
        init_params[-2] = 0.25  # home advantage
        init_params[-1] = -0.05  # rho

        def loss_fn(params: np.ndarray) -> float:
            alphas_free = params[: n_teams - 1]
            alpha_last = -np.sum(alphas_free)
            alphas = np.append(alphas_free, alpha_last)
            betas = params[n_teams - 1 : 2 * n_teams - 1]
            gamma = params[-2]
            rho_val = params[-1]

            # Compute lambda (home) and mu (away)
            # lambda = exp(alpha_h - beta_a + gamma)
            # mu = exp(alpha_a - beta_h)
            log_lh = alphas[home_idxs] - betas[away_idxs] + gamma
            log_la = alphas[away_idxs] - betas[home_idxs]

            # Clip for numerical stability
            log_lh = np.clip(log_lh, -3.0, 3.0)
            log_la = np.clip(log_la, -3.0, 3.0)
            lh = np.exp(log_lh)
            la = np.exp(log_la)

            # Log-likelihood terms
            # log(Poisson) = k*log(lambda) - lambda - log(k!)
            log_p_home = home_goals * log_lh - lh
            log_p_away = away_goals * log_la - la

            # Tau adjustment
            tau_vals = np.ones(len(matches))
            for i in range(len(matches)):
                hg = home_goals[i]
                ag = away_goals[i]
                if hg <= 1 and ag <= 1:
                    tau_vals[i] = tau(hg, ag, lh[i], la[i], rho_val)

            ll = weights * (np.log(np.maximum(1e-9, tau_vals)) + log_p_home + log_p_away)
            # Negative log likelihood (with L2 regularization on defense)
            reg = 0.01 * np.sum(betas**2)
            return -np.sum(ll) + reg

        # Parameter bounds
        bounds = []
        for _ in range(n_teams - 1):
            bounds.append((-3.0, 3.0))  # attack
        for _ in range(n_teams):
            bounds.append((-3.0, 3.0))  # defense
        bounds.append((0.0, 1.0))  # home advantage >= 0
        bounds.append((-0.3, 0.3))  # rho around 0

        res = minimize(
            loss_fn, init_params, method="L-BFGS-B", bounds=bounds, options={"maxiter": 350}
        )

        alphas_free = res.x[: n_teams - 1]
        self.attack = np.append(alphas_free, -np.sum(alphas_free))
        self.defence = res.x[n_teams - 1 : 2 * n_teams - 1]
        self.home_adv = float(res.x[-2])
        self.rho = float(res.x[-1])
        self.last_trained = datetime.now(UTC).isoformat()

        return self

    def predict_match(self, home_id: str, away_id: str, max_goals: int = 6) -> dict[str, Any]:
        """
        Produce pre-match Dixon-Coles prediction for home vs away.
        """
        home_idx = self.team_indices.get(str(home_id))
        away_idx = self.team_indices.get(str(away_id))

        # Default ratings for unseen teams
        alpha_h = float(self.attack[home_idx]) if home_idx is not None else 0.0
        beta_h = float(self.defence[home_idx]) if home_idx is not None else 0.0
        alpha_a = float(self.attack[away_idx]) if away_idx is not None else 0.0
        beta_a = float(self.defence[away_idx]) if away_idx is not None else 0.0

        # Calculate lambda (home expected goals) and mu (away expected goals)
        lambda_h = math.exp(alpha_h - beta_a + self.home_adv)
        lambda_a = math.exp(alpha_a - beta_h)

        # Build score grid 0..max_goals
        grid = np.zeros((max_goals + 1, max_goals + 1))
        for x in range(max_goals + 1):
            for y in range(max_goals + 1):
                p_x = poisson.pmf(x, lambda_h)
                p_y = poisson.pmf(y, lambda_a)
                adj = tau(x, y, lambda_h, lambda_a, self.rho)
                grid[x, y] = adj * p_x * p_y

        # Normalize grid to sum to 1.0
        total_p = np.sum(grid)
        if total_p > 0:
            grid = grid / total_p

        # Probabilities
        home_win = float(np.sum(np.tril(grid, -1)))
        draw = float(np.sum(np.diag(grid)))
        away_win = float(np.sum(np.triu(grid, 1)))

        # Apply calibration shrink towards league base rates if configured
        if self.shrink_k > 0.0 and self.base_rates:
            k = self.shrink_k
            br_h = self.base_rates.get("home", 0.3333)
            br_d = self.base_rates.get("draw", 0.3333)
            br_a = self.base_rates.get("away", 0.3333)
            home_win = (1.0 - k) * home_win + k * br_h
            draw = (1.0 - k) * draw + k * br_d
            away_win = (1.0 - k) * away_win + k * br_a
            tot = home_win + draw + away_win
            if tot > 0:
                home_win /= tot
                draw /= tot
                away_win /= tot

        # Over 2.5 goals
        over_25 = 0.0
        btts = 0.0
        likely_scores = []

        for x in range(max_goals + 1):
            for y in range(max_goals + 1):
                p = float(grid[x, y])
                if x + y > 2:
                    over_25 += p
                if x >= 1 and y >= 1:
                    btts += p
                likely_scores.append(
                    {"score": f"{x}-{y}", "home": x, "away": y, "prob": round(p, 4)}
                )

        likely_scores.sort(key=lambda s: s["prob"], reverse=True)
        top_5_scores = likely_scores[:5]

        # Score grid matrix for API
        score_matrix = [
            [round(float(grid[x, y]), 4) for y in range(max_goals + 1)]
            for x in range(max_goals + 1)
        ]

        return {
            "league": self.league,
            "home_id": str(home_id),
            "away_id": str(away_id),
            "home_name": self.team_names.get(str(home_id), "Home Team"),
            "away_name": self.team_names.get(str(away_id), "Away Team"),
            "expected_goals": {
                "home": round(lambda_h, 2),
                "away": round(lambda_a, 2),
            },
            "win_probability": {
                "home": round(home_win, 4),
                "draw": round(draw, 4),
                "away": round(away_win, 4),
            },
            "over_25": round(over_25, 4),
            "btts": round(btts, 4),
            "top_scores": top_5_scores,
            "score_grid": score_matrix,
        }

    def save(self, file_path: Path | None = None) -> Path:
        if file_path is None:
            file_path = ARTIFACTS_DIR / f"ratings_{self.league}.json"
        file_path.parent.mkdir(parents=True, exist_ok=True)

        data = {
            "league": self.league,
            "xi": self.xi,
            "home_adv": round(self.home_adv, 4),
            "rho": round(self.rho, 4),
            "shrink_k": round(self.shrink_k, 4),
            "base_rates": {k: round(v, 4) for k, v in self.base_rates.items()},
            "last_trained": self.last_trained,
            "teams": self.teams,
            "team_names": self.team_names,
            "attack": [round(float(a), 4) for a in self.attack],
            "defence": [round(float(d), 4) for d in self.defence],
        }

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        return file_path

    @classmethod
    def load(cls, file_path: Path) -> "DixonColesModel":
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        model = cls(league=data["league"], xi=data.get("xi", 0.0019))
        model.home_adv = float(data["home_adv"])
        model.rho = float(data["rho"])
        model.shrink_k = float(data.get("shrink_k", 0.0))
        model.base_rates = data.get("base_rates", {})
        model.last_trained = data.get("last_trained")
        model.teams = data["teams"]
        model.team_indices = {t: i for i, t in enumerate(model.teams)}
        model.team_names = data.get("team_names", {})
        model.attack = np.array(data["attack"], dtype=float)
        model.defence = np.array(data["defence"], dtype=float)

        return model
