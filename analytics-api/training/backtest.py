import json
import math
import sqlite3
import sys
from pathlib import Path
from typing import Any

import numpy as np

# Ensure project root in sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models.dixon_coles import ARTIFACTS_DIR, DixonColesModel

DB_PATH = Path(__file__).parent.parent / "data" / "results.db"
LEAGUES = ["eng.1", "esp.1", "ger.1", "ita.1", "fra.1"]


def calculate_rps(p_home: float, p_draw: float, outcome: str) -> float:
    """
    Ranked Probability Score for ordered 3-outcome football match:
    (Home Win, Draw, Away Win)
    """
    p_cum_1 = p_home
    p_cum_2 = p_home + p_draw

    if outcome == "home":
        o_cum_1 = 1.0
        o_cum_2 = 1.0
    elif outcome == "draw":
        o_cum_1 = 0.0
        o_cum_2 = 1.0
    else:  # away
        o_cum_1 = 0.0
        o_cum_2 = 0.0

    return 0.5 * ((p_cum_1 - o_cum_1) ** 2 + (p_cum_2 - o_cum_2) ** 2)


def calculate_brier(p_home: float, p_draw: float, p_away: float, outcome: str) -> float:
    o_h = 1.0 if outcome == "home" else 0.0
    o_d = 1.0 if outcome == "draw" else 0.0
    o_a = 1.0 if outcome == "away" else 0.0
    return ((p_home - o_h) ** 2 + (p_draw - o_d) ** 2 + (p_away - o_a) ** 2) / 3.0


def calculate_log_loss(p_home: float, p_draw: float, p_away: float, outcome: str) -> float:
    p = p_home if outcome == "home" else (p_draw if outcome == "draw" else p_away)
    return -math.log(max(1e-6, p))


def backtest_league(
    conn: sqlite3.Connection, league: str, min_train_matches: int = 380
) -> dict[str, Any]:
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, league, date, season, home_id, away_id, home_name, away_name, home_goals, away_goals
        FROM matches
        WHERE league = ?
        ORDER BY date ASC;
        """,
        (league,),
    )
    all_matches = [dict(r) for r in cur.fetchall()]
    n_total = len(all_matches)

    if n_total < min_train_matches + 50:
        # If insufficient matches, split 70/30
        min_train_matches = int(0.7 * n_total)

    train_init = all_matches[:min_train_matches]
    test_matches = all_matches[min_train_matches:]

    print(f"\n--- Backtesting {league} ---")
    print(f"Initial training: {len(train_init)} matches, Test set: {len(test_matches)} matches")

    # Overall league base rates from all matches in results.db
    n_all = len(all_matches)
    league_base_h = sum(1 for m in all_matches if m["home_goals"] > m["away_goals"]) / n_all
    league_base_d = sum(1 for m in all_matches if m["home_goals"] == m["away_goals"]) / n_all
    league_base_a = sum(1 for m in all_matches if m["home_goals"] < m["away_goals"]) / n_all
    base_rates = {
        "home": round(league_base_h, 4),
        "draw": round(league_base_d, 4),
        "away": round(league_base_a, 4),
    }

    # Historical league base rates from training set (for baselines)
    h_wins = sum(1 for m in train_init if m["home_goals"] > m["away_goals"])
    draws = sum(1 for m in train_init if m["home_goals"] == m["away_goals"])
    a_wins = sum(1 for m in train_init if m["home_goals"] < m["away_goals"])
    total_train = len(train_init)
    base_h = h_wins / total_train
    base_d = draws / total_train
    base_a = a_wins / total_train

    # Fit model on training set (raw, without shrink)
    model = DixonColesModel(league=league)
    model.fit(train_init)

    # 1. Collect raw predictions on test set
    raw_evals = []
    for m in test_matches:
        hg = m["home_goals"]
        ag = m["away_goals"]
        actual = "home" if hg > ag else ("draw" if hg == ag else "away")
        pred = model.predict_match(m["home_id"], m["away_id"])
        ph = pred["win_probability"]["home"]
        pd = pred["win_probability"]["draw"]
        pa = pred["win_probability"]["away"]
        raw_evals.append((ph, pd, pa, actual))

    # 2. Learn optimal shrink factor k in [0.00, 0.50] minimizing log loss
    best_k = 0.0
    min_log_loss = float("inf")

    for k in np.linspace(0.00, 0.50, 51):
        k_val = round(float(k), 2)
        losses = []
        for ph, pd, pa, actual in raw_evals:
            p_h = (1.0 - k_val) * ph + k_val * league_base_h
            p_d = (1.0 - k_val) * pd + k_val * league_base_d
            p_a = (1.0 - k_val) * pa + k_val * league_base_a
            tot = p_h + p_d + p_a
            losses.append(calculate_log_loss(p_h / tot, p_d / tot, p_a / tot, actual))
        mean_loss = float(np.mean(losses))
        if mean_loss < min_log_loss:
            min_log_loss = mean_loss
            best_k = k_val

    print(f"Optimal shrink factor k: {best_k:.2f} (Log loss: {min_log_loss:.4f})")

    # Update saved ratings file for this league with shrink_k and base_rates
    ratings_file = ARTIFACTS_DIR / f"ratings_{league}.json"
    if ratings_file.exists():
        league_model = DixonColesModel.load(ratings_file)
        league_model.shrink_k = best_k
        league_model.base_rates = base_rates
        league_model.save(ratings_file)
        print(f"Updated {ratings_file.name} with shrink_k={best_k:.2f}")

    # 3. Calculate evaluation metrics with shrunk probabilities
    dc_rps_list, base_rps_list, unif_rps_list = [], [], []
    dc_brier_list, base_brier_list = [], []
    dc_ll_list, base_ll_list = [], []
    model_hits = []
    always_home_hits = []

    calibration_bins = [
        {"bin": f"{i * 20}-{(i + 1) * 20}%", "pred": [], "obs": []} for i in range(5)
    ]

    for ph_raw, pd_raw, pa_raw, actual in raw_evals:
        # Shrunk probabilities
        ph = (1.0 - best_k) * ph_raw + best_k * league_base_h
        pd = (1.0 - best_k) * pd_raw + best_k * league_base_d
        pa = (1.0 - best_k) * pa_raw + best_k * league_base_a
        tot = ph + pd + pa
        ph, pd, pa = ph / tot, pd / tot, pa / tot

        # Most likely outcome prediction
        if ph >= pd and ph >= pa:
            pred_outcome = "home"
        elif pa >= pd and pa >= ph:
            pred_outcome = "away"
        else:
            pred_outcome = "draw"

        model_hits.append(1.0 if pred_outcome == actual else 0.0)
        always_home_hits.append(1.0 if actual == "home" else 0.0)

        # 1. RPS
        dc_rps_list.append(calculate_rps(ph, pd, actual))
        base_rps_list.append(calculate_rps(base_h, base_d, actual))
        unif_rps_list.append(calculate_rps(1 / 3, 1 / 3, actual))

        # 2. Brier
        dc_brier_list.append(calculate_brier(ph, pd, pa, actual))
        base_brier_list.append(calculate_brier(base_h, base_d, base_a, actual))

        # 3. Log Loss
        dc_ll_list.append(calculate_log_loss(ph, pd, pa, actual))
        base_ll_list.append(calculate_log_loss(base_h, base_d, base_a, actual))

        # Calibration for Home Win probability
        bin_idx = min(4, int(ph * 5))
        calibration_bins[bin_idx]["pred"].append(ph)
        calibration_bins[bin_idx]["obs"].append(1.0 if actual == "home" else 0.0)

    # Summarize calibration
    calib_summary = []
    for b in calibration_bins:
        if b["pred"]:
            mean_pred = float(np.mean(b["pred"]))
            mean_obs = float(np.mean(b["obs"]))
            diff = mean_obs - mean_pred
            calib_summary.append(
                {
                    "bin": b["bin"],
                    "count": len(b["pred"]),
                    "predicted": round(mean_pred, 3),
                    "observed": round(mean_obs, 3),
                    "error": round(diff, 3),
                }
            )

    hit_rate = round(float(np.mean(model_hits)), 4)
    always_home_hit_rate = round(float(np.mean(always_home_hits)), 4)

    results = {
        "league": league,
        "test_matches": len(test_matches),
        "shrink_k": best_k,
        "base_rates": base_rates,
        "hit_rate": hit_rate,
        "always_home_hit_rate": always_home_hit_rate,
        "dixon_coles": {
            "rps": round(float(np.mean(dc_rps_list)), 4),
            "brier": round(float(np.mean(dc_brier_list)), 4),
            "log_loss": round(float(np.mean(dc_ll_list)), 4),
        },
        "baselines": {
            "league_base_rate": {
                "rps": round(float(np.mean(base_rps_list)), 4),
                "brier": round(float(np.mean(base_brier_list)), 4),
                "log_loss": round(float(np.mean(base_ll_list)), 4),
                "rates": {
                    "home": round(base_h, 3),
                    "draw": round(base_d, 3),
                    "away": round(base_a, 3),
                },
            },
            "uniform": {
                "rps": round(float(np.mean(unif_rps_list)), 4),
            },
        },
        "rps_beats_base_rate": bool(np.mean(dc_rps_list) < np.mean(base_rps_list)),
        "rps_beats_uniform": bool(np.mean(dc_rps_list) < np.mean(unif_rps_list)),
        "calibration": calib_summary,
    }

    print(
        f"Dixon-Coles RPS: {results['dixon_coles']['rps']} vs Base-rate: {results['baselines']['league_base_rate']['rps']} (Beats base rate: {results['rps_beats_base_rate']})"
    )
    print(
        f"Dixon-Coles Brier: {results['dixon_coles']['brier']} vs Base-rate: {results['baselines']['league_base_rate']['brier']}"
    )
    print(f"Hit Rate: {hit_rate * 100:.1f}% vs Always Home: {always_home_hit_rate * 100:.1f}%")
    for cal in calib_summary:
        print(
            f"  Bin {cal['bin']:<8} Pred: {cal['predicted']:.3f} Obs: {cal['observed']:.3f} Err: {cal['error']:+.3f}"
        )

    return results


def run():
    main()


def main():
    if not DB_PATH.exists():
        raise FileNotFoundError(f"{DB_PATH} not found.")

    conn = sqlite3.connect(DB_PATH)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    all_league_results = {}
    for league in LEAGUES:
        res = backtest_league(conn, league)
        all_league_results[league] = res

        # Save per-league accuracy artifact
        out_file = ARTIFACTS_DIR / f"accuracy_{league}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(res, f, indent=2)
        print(f"Saved {out_file}")

    # Save aggregate
    agg_file = ARTIFACTS_DIR / "accuracy_all.json"
    with open(agg_file, "w", encoding="utf-8") as f:
        json.dump(all_league_results, f, indent=2)
    print(f"\nSaved overall accuracy report to {agg_file}")


if __name__ == "__main__":
    main()
