import sqlite3
import sys
from pathlib import Path

# Ensure project root in sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models.dixon_coles import ARTIFACTS_DIR, DixonColesModel

DB_PATH = Path(__file__).parent.parent / "data" / "results.db"
LEAGUES = ["eng.1", "esp.1", "ger.1", "ita.1", "fra.1", "uefa.champions"]


def load_league_matches(conn: sqlite3.Connection, league: str) -> list[dict]:
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
    return [dict(r) for r in cur.fetchall()]


def run():
    main()


def main():
    if not DB_PATH.exists():
        raise FileNotFoundError(f"{DB_PATH} not found. Run backfill_results.py first.")

    conn = sqlite3.connect(DB_PATH)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    print("Fitting Dixon-Coles team ratings across target leagues...")
    for league in LEAGUES:
        matches = load_league_matches(conn, league)
        if not matches:
            print(f"  -> Skipping {league}: no matches found.")
            continue

        print(f"Fitting {league} on {len(matches)} matches...")
        model = DixonColesModel(league=league)
        model.fit(matches)

        save_path = ARTIFACTS_DIR / f"ratings_{league}.json"
        model.save(save_path)

        # Print top attack teams
        top_idx = sorted(range(len(model.teams)), key=lambda i: model.attack[i], reverse=True)[:5]
        print(f"  Home Advantage (gamma): {model.home_adv:.3f}, Rho: {model.rho:.3f}")
        print("  Top 5 Attack Ratings:")
        for idx in top_idx:
            team_id = model.teams[idx]
            name = model.team_names.get(team_id, team_id)
            print(
                f"    - {name:<22} alpha: {model.attack[idx]:+.3f}, beta: {model.defence[idx]:+.3f}"
            )
        print(f"  -> Saved ratings to {save_path}\n")


if __name__ == "__main__":
    main()
