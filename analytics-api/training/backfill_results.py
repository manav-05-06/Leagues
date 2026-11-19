import sqlite3
import sys
from pathlib import Path
from typing import Any

# Ensure project root in sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx

DATA_DIR = Path(__file__).parent.parent / "data"
DB_PATH = DATA_DIR / "results.db"

TARGET_LEAGUES = [
    "eng.1",  # Premier League
    "esp.1",  # La Liga
    "ger.1",  # Bundesliga
    "ita.1",  # Serie A
    "fra.1",  # Ligue 1
    "uefa.champions",  # Champions League
]

# Calendar years to fetch to cover last 2 complete seasons (e.g. 2023/24 and 2024/25)
YEARS_TO_FETCH = ["2023", "2024", "2025", "2026"]


def init_db(db_path: Path = DB_PATH) -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    with conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS matches (
                id TEXT PRIMARY KEY,
                league TEXT NOT NULL,
                date TEXT NOT NULL,
                season TEXT NOT NULL,
                home_id TEXT NOT NULL,
                away_id TEXT NOT NULL,
                home_name TEXT NOT NULL,
                away_name TEXT NOT NULL,
                home_goals INTEGER NOT NULL,
                away_goals INTEGER NOT NULL
            );
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_matches_league ON matches(league);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date);")
    return conn


def extract_match(event: dict[str, Any], league_slug: str) -> dict[str, Any] | None:
    event_id = str(event.get("id", ""))
    date_str = str(event.get("date", ""))
    season_info = event.get("season", {})
    season_year = str(season_info.get("year", ""))
    season_slug = season_info.get("slug") or season_year

    competitions = event.get("competitions", [{}])
    comp = competitions[0] if competitions else {}
    status_type = comp.get("status", {}).get("type", {})
    status_state = status_type.get("state", "")

    # Only include completed matches with scores
    if status_state != "post" and status_type.get("name") not in (
        "STATUS_FULL_TIME",
        "STATUS_FINAL_AET",
        "STATUS_FINAL_PEN",
    ):
        return None

    competitors = comp.get("competitors", [])
    if len(competitors) < 2:
        return None

    home_comp = next((c for c in competitors if c.get("homeAway") == "home"), None)
    away_comp = next((c for c in competitors if c.get("homeAway") == "away"), None)

    if not home_comp or not away_comp:
        home_comp, away_comp = competitors[0], competitors[1]

    home_id = str(home_comp.get("team", {}).get("id", ""))
    away_id = str(away_comp.get("team", {}).get("id", ""))
    home_name = home_comp.get("team", {}).get("displayName") or home_comp.get("team", {}).get(
        "name", "Home"
    )
    away_name = away_comp.get("team", {}).get("displayName") or away_comp.get("team", {}).get(
        "name", "Away"
    )

    try:
        home_goals = int(home_comp.get("score", 0))
        away_goals = int(away_comp.get("score", 0))
    except (ValueError, TypeError):
        return None

    if not home_id or not away_id:
        return None

    return {
        "id": event_id,
        "league": league_slug,
        "date": date_str,
        "season": season_slug,
        "home_id": home_id,
        "away_id": away_id,
        "home_name": home_name,
        "away_name": away_name,
        "home_goals": home_goals,
        "away_goals": away_goals,
    }


def backfill_league(
    league_slug: str,
    conn: sqlite3.Connection,
    client: httpx.Client,
    years: list[str] = YEARS_TO_FETCH,
) -> int:
    inserted_or_updated = 0
    print(f"Fetching results for {league_slug}...")

    for year in years:
        url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{league_slug}/scoreboard?dates={year}&limit=500"
        try:
            res = client.get(url, timeout=15)
            if res.status_code != 200:
                print(f"  -> HTTP {res.status_code} for {year}")
                continue
            data = res.json()
            events = data.get("events", [])

            for ev in events:
                match_data = extract_match(ev, league_slug)
                if match_data:
                    with conn:
                        conn.execute(
                            """
                            INSERT OR REPLACE INTO matches (
                                id, league, date, season, home_id, away_id,
                                home_name, away_name, home_goals, away_goals
                            ) VALUES (
                                :id, :league, :date, :season, :home_id, :away_id,
                                :home_name, :away_name, :home_goals, :away_goals
                            )
                            """,
                            match_data,
                        )
                        inserted_or_updated += 1
        except Exception as e:  # noqa: BLE001
            print(f"  -> Failed to fetch {league_slug} {year}: {e}")

    return inserted_or_updated


def main():
    conn = init_db()
    headers = {"User-Agent": "Leagues-Analytics/1.0 (Backfill)"}
    with httpx.Client(headers=headers) as client:
        for league in TARGET_LEAGUES:
            backfill_league(league, conn, client)

    # Verification checks
    cur = conn.cursor()
    cur.execute("SELECT league, count(*), count(distinct season) FROM matches GROUP BY league;")
    rows = cur.fetchall()
    print("\n--- Backfill Summary (data/results.db) ---")
    for r in rows:
        print(f"League: {r[0]:<16} Matches: {r[1]:<6} Seasons: {r[2]}")

    # Step 14 check: Premier League count
    cur.execute("SELECT count(*) FROM matches WHERE league = 'eng.1';")
    pl_count = cur.fetchone()[0]
    print(f"\nPremier League Total Matches in DB: {pl_count}")


if __name__ == "__main__":
    main()
