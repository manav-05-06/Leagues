import sys
from pathlib import Path

# Add project root to sys.path so app modules can be imported
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from statsbombpy import sb

from app.models.geometry import calculate_angle, calculate_distance, statsbomb_to_metres

OUTPUT_DIR = Path(__file__).parent.parent / "data" / "raw"
OUTPUT_FILE = OUTPUT_DIR / "statsbomb_shots.parquet"

# Target high-volume men's competitions in StatsBomb open data
TARGET_COMPETITIONS = [
    # (country_name, competition_name, season_name)
    ("Europe", "UEFA Euro", "2024"),
    ("Europe", "UEFA Euro", "2020"),
    ("International", "FIFA World Cup", "2022"),
    ("International", "FIFA World Cup", "2018"),
    ("South America", "Copa America", "2024"),
    ("Germany", "1. Bundesliga", "2023/2024"),
    ("Spain", "La Liga", "2020/2021"),
    ("Spain", "La Liga", "2019/2020"),
    ("Spain", "La Liga", "2018/2019"),
    ("Europe", "Champions League", "2018/2019"),
]


def extract_shots_from_events(
    shots_df: pd.DataFrame, comp_name: str, season_name: str
) -> pd.DataFrame:
    if shots_df is None or len(shots_df) == 0:
        return pd.DataFrame()

    records = []
    for _, row in shots_df.iterrows():
        loc = row.get("location")
        if not isinstance(loc, (list, tuple)) or len(loc) < 2:
            continue

        x, y = float(loc[0]), float(loc[1])
        dx, dy = statsbomb_to_metres(x, y)
        dist = calculate_distance(dx, dy)
        ang = calculate_angle(dx, dy)

        body_part = str(row.get("shot_body_part", ""))
        shot_type = str(row.get("shot_type", ""))
        pattern = str(row.get("play_pattern", ""))
        outcome = str(row.get("shot_outcome", ""))

        is_header = 1 if "Head" in body_part else 0
        is_penalty = 1 if "Penalty" in shot_type else 0
        is_dfk = 1 if "Free Kick" in shot_type else 0
        from_corner = 1 if "From Corner" in pattern else 0
        fast_break = 1 if "From Counter" in pattern else 0
        assisted = 1 if pd.notna(row.get("shot_key_pass_id")) else 0
        is_goal = 1 if outcome == "Goal" else 0
        sb_xg = (
            float(row.get("shot_statsbomb_xg")) if pd.notna(row.get("shot_statsbomb_xg")) else 0.0
        )

        records.append(
            {
                "id": str(row.get("id")),
                "competition": comp_name,
                "season": season_name,
                "x": x,
                "y": y,
                "distance": round(dist, 2),
                "angle": round(ang, 4),
                "header": is_header,
                "penalty": is_penalty,
                "direct_free_kick": is_dfk,
                "from_corner": from_corner,
                "fast_break": fast_break,
                "assisted": assisted,
                "is_goal": is_goal,
                "statsbomb_xg": round(sb_xg, 4),
            }
        )

    return pd.DataFrame(records)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    all_shots = []

    print("Fetching StatsBomb Open Data shots across target competitions...")
    for country, comp_name, season_name in TARGET_COMPETITIONS:
        print(f"Fetching {comp_name} ({season_name})...")
        try:
            events_dict = sb.competition_events(
                country=country,
                division=comp_name,
                season=season_name,
                split=True,
            )
            shots_df = events_dict.get("shots")
            if shots_df is not None:
                parsed = extract_shots_from_events(shots_df, comp_name, season_name)
                print(f"  -> Extracted {len(parsed)} shots.")
                all_shots.append(parsed)
        except Exception as e:  # noqa: BLE001
            print(f"  -> Warning: failed to fetch {comp_name} {season_name}: {e}")

    if not all_shots:
        raise RuntimeError("No shots were fetched!")

    combined = pd.concat(all_shots, ignore_index=True)
    combined.to_parquet(OUTPUT_FILE, index=False)
    print(f"\nSaved {len(combined)} shots to {OUTPUT_FILE}")

    # Step 7 Checks:
    total = len(combined)
    goals = combined["is_goal"].sum()
    goal_rate = goals / total
    penalties = combined[combined["penalty"] == 1]
    pen_rate = penalties["is_goal"].mean() if len(penalties) > 0 else 0.0

    print(f"Total Shots: {total}")
    print(f"Overall Goal Rate: {goal_rate:.2%} (expected ~10-11%)")
    print(f"Penalties Count: {len(penalties)}, Conversion Rate: {pen_rate:.2%} (expected ~76-79%)")


if __name__ == "__main__":
    main()
