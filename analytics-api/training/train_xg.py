import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss

DATA_FILE = Path(__file__).parent.parent / "data" / "raw" / "statsbomb_shots.parquet"
ARTIFACTS_DIR = Path(__file__).parent.parent / "artifacts"
REPORTS_DIR = Path(__file__).parent / "reports"
MODEL_JSON = ARTIFACTS_DIR / "xg_model.json"
CALIBRATION_PNG = REPORTS_DIR / "xg_calibration.png"

FEATURE_NAMES = [
    "distance",
    "angle",
    "distance_x_angle",
    "header",
    "direct_free_kick",
    "from_corner",
    "fast_break",
    "assisted",
]


def compute_expected_calibration_error(y_true, y_prob, n_bins=10):
    bin_edges = np.linspace(0, 1, n_bins + 1)
    bin_indices = np.digitize(y_prob, bin_edges) - 1
    bin_indices = np.clip(bin_indices, 0, n_bins - 1)

    ece = 0.0
    total_samples = len(y_true)

    for i in range(n_bins):
        bin_mask = bin_indices == i
        bin_count = np.sum(bin_mask)
        if bin_count > 0:
            bin_acc = np.mean(y_true[bin_mask])
            bin_conf = np.mean(y_prob[bin_mask])
            ece += (bin_count / total_samples) * abs(bin_acc - bin_conf)

    return float(ece)


def main():
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"{DATA_FILE} not found. Run fetch_statsbomb.py first.")

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    df = pd.read_parquet(DATA_FILE)
    print(f"Loaded {len(df)} total shots.")

    # Calculate penalty conversion
    penalties = df[df["penalty"] == 1]
    penalty_xg = float(penalties["is_goal"].mean()) if len(penalties) > 0 else 0.77
    print(f"Penalty xG (fixed rate): {penalty_xg:.4f} ({len(penalties)} penalties)")

    # Filter out penalties for logistic regression training
    non_pen = df[df["penalty"] == 0].copy()
    non_pen["distance_x_angle"] = non_pen["distance"] * non_pen["angle"]

    # Split by season: train on earlier seasons, test on latest
    test_seasons = {"2020/2021", "2023/2024", "2024", "2022"}
    is_test = non_pen["season"].isin(test_seasons)

    train_df = non_pen[~is_test]
    test_df = non_pen[is_test]

    # If split was too small or skewed, fallback to random stratified split
    if len(train_df) < 5000 or len(test_df) < 2000:
        print("Using random 80/20 train/test split...")
        shuffled = non_pen.sample(frac=1.0, random_state=42)
        split_idx = int(0.8 * len(shuffled))
        train_df = shuffled.iloc[:split_idx]
        test_df = shuffled.iloc[split_idx:]

    print(f"Training on {len(train_df)} shots, testing on {len(test_df)} shots.")

    X_train = train_df[FEATURE_NAMES].values
    y_train = train_df["is_goal"].values
    X_test = test_df[FEATURE_NAMES].values
    y_test = test_df["is_goal"].values

    # 1. Fit main model
    model = LogisticRegression(max_iter=1000, solver="lbfgs")
    model.fit(X_train, y_train)

    y_pred_prob = model.predict_proba(X_test)[:, 1]

    # 2. Fit distance-only baseline
    dist_model = LogisticRegression(max_iter=1000)
    dist_model.fit(train_df[["distance"]].values, y_train)
    y_dist_prob = dist_model.predict_proba(test_df[["distance"]].values)[:, 1]

    # Metrics
    our_logloss = float(log_loss(y_test, y_pred_prob))
    dist_logloss = float(log_loss(y_test, y_dist_prob))
    our_brier = float(brier_score_loss(y_test, y_pred_prob))
    dist_brier = float(brier_score_loss(y_test, y_dist_prob))
    our_ece = compute_expected_calibration_error(y_test, y_pred_prob)

    # Correlation with StatsBomb's own xG on test set
    sb_test_xg = test_df["statsbomb_xg"].values
    correlation = float(np.corrcoef(y_pred_prob, sb_test_xg)[0, 1])

    print("\n--- Model Evaluation Results ---")
    print(
        f"Log Loss:      {our_logloss:.4f} (Distance-only baseline: {dist_logloss:.4f}) -> Beats baseline: {our_logloss < dist_logloss}"
    )
    print(f"Brier Score:   {our_brier:.4f} (Distance-only baseline: {dist_brier:.4f})")
    print(f"ECE (Calib):   {our_ece:.4f} (Target: < 0.02)")
    print(f"Corr with SB:  {correlation:.4f} (Target: > 0.80)")

    # Save model artifact JSON
    model_artifact = {
        "features": FEATURE_NAMES,
        "coefficients": [round(c, 6) for c in model.coef_[0].tolist()],
        "intercept": round(float(model.intercept_[0]), 6),
        "penalty_xg": round(penalty_xg, 4),
        "metrics": {
            "test_log_loss": round(our_logloss, 4),
            "baseline_log_loss": round(dist_logloss, 4),
            "test_brier": round(our_brier, 4),
            "ece": round(our_ece, 4),
            "statsbomb_correlation": round(correlation, 4),
            "train_samples": len(train_df),
            "test_samples": len(test_df),
        },
    }

    with open(MODEL_JSON, "w") as f:
        json.dump(model_artifact, f, indent=2)
    print(f"\nSaved model artifact to {MODEL_JSON}")

    # Plot Calibration Curve
    prob_true, prob_pred = calibration_curve(y_test, y_pred_prob, n_bins=10)
    plt.figure(figsize=(7, 7))
    plt.plot([0, 1], [0, 1], linestyle="--", color="gray", label="Perfect Calibration")
    plt.plot(
        prob_pred,
        prob_true,
        marker="o",
        color="#00ff87",
        label=f"xG Logistic Regression (ECE = {our_ece:.4f})",
    )
    plt.xlabel("Predicted xG Probability")
    plt.ylabel("Observed Goal Frequency")
    plt.title("xG Model Calibration Curve")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(CALIBRATION_PNG, dpi=150)
    plt.close()
    print(f"Saved calibration report plot to {CALIBRATION_PNG}")


if __name__ == "__main__":
    main()
