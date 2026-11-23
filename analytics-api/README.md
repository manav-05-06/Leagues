# Leagues Match Analytics API

A high-performance Python FastAPI service providing expected goals (xG) inference, Dixon–Coles Poisson scoreline & win probability predictions, in-play momentum tracking, goalkeeper goals prevented analytics, and a 2D 22-player tactical replay engine.

---

## Capabilities & Architecture

- **StatsBomb xG Inference Model (`app/models/xg.py`)**:
  Trained on 10,000+ open-data shots using distance, visible goal angle, headers, free kicks, and fast breaks. Computes live xG probabilities for all ESPN in-match shots.
- **Dixon–Coles Team Ratings & Predictions (`app/models/dixon_coles.py`)**:
  Bivariate Poisson model with exponential time-decay weighting ($\xi \approx 0.0019$), low-score correction $\rho$, and home advantage $\gamma$ fitted over 7,400+ historical league matches.
- **In-Play Live Win Probability & Momentum (`app/models/inplay.py`, `app/models/momentum.py`)**:
  Calculates dynamic win probabilities blending pre-match ratings with live xG rate and red-card adjustments. Computes a rolling 5-minute attacking momentum wave.
- **Player & Goalkeeper Impact (`app/models/players.py`)**:
  Combines Opta rosters with parsed events to compute individual xG, assists, and goalkeeper goals prevented ($\text{PSxG} - \text{goals conceded}$).
- **2D Tactical Replay Engine (`app/models/shape.py`, `app/routers/replay.py`)**:
  Serves SkillCorner open tracking data at 10 fps with real-time convex hull team outlines, defensive line height, centroid tracking, and pressing intensity.

---

## Setup & Running

### Requirements
- Python 3.12+
- `uv` package manager

### Local Development
```bash
cd analytics-api
uv sync
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation is available at `http://localhost:8000/docs`.

### Running Tests & Linting
```bash
pytest
ruff check .
```

### Operational Training & Refresh Commands
```bash
# Backfill historical match results into SQLite
python training/backfill_results.py

# Fit Dixon-Coles ratings for all top leagues
python training/fit_ratings.py

# Train StatsBomb xG model
python training/train_xg.py

# Run walk-forward out-of-sample backtest
python training/backtest.py

# Ingest SkillCorner tracking replay match
python training/ingest_skillcorner.py --match-id 2017461
```

---

## Data Credits & Attribution

- **StatsBomb Open Data**: Training data for open expected goals models.
- **SkillCorner Open Data (MIT License)**: 10 fps 22-player tracking and dynamic tactical events.
- **ESPN Soccer API**: Fixture schedules, live scores, lineups, and match incident data.
