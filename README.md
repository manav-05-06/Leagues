# MATCHDAY ARENA (Leagues)

A fast, responsive soccer dashboard and matchday tracker built with React 18, Vite, Zustand, and TanStack React Query, powered by ESPN's public soccer APIs.

## Features

- **Matchday Fixtures & Results:**
  - **All Fixtures:** Single-day schedule view with day-by-day navigation (◀ / ▶) and quick "Today" reset across 19 global competitions.
  - **Single League View:** Full-season calendar fixtures and results for 19 leagues (Premier League, La Liga, Champions League, Serie A, Bundesliga, MLS, and more), filterable by season (e.g. 2024-25, 2025-26).
  - Status filters (All, Live Now, Upcoming, Results) and team search/dropdown filters.
- **Matchday Live Radar:** Real-time scoreboard modal displaying all matches currently in progress worldwide with auto-refreshing scores.
- **Match Analytics & Expected Goals (xG):**
  - Metric pitch shot maps sized by xG and colored by outcome.
  - Behind-the-keeper Goal Mouth view with goal placement coordinates.
  - Cumulative team xG step timelines.
  - 3×3 pitch zone event maps for fouls, corners, and offsides.
  - Dixon–Coles pre-match scoreline probabilities and live win-probability progression.
  - Rolling 5-minute attacking momentum wave.
  - Tactical lineup pitch (4-3-3, 4-2-3-1, 3-5-2, etc.) and goalkeeper goals prevented card ($\text{PSxG} - \text{goals conceded}$).
- **Tactical 2D Replay (Open Tracking Data):**
  - Full 22-player tracking playback at 10 fps powered by SkillCorner open data.
  - Real-time team convex hull outline, centroid, defensive line depth, and pressing player auras.
  - Voronoi space control map powered by `d3-delaunay`.
  - Scrubbable timeline with goal markers, speed controls (0.5×-4×), and interactive player spotlight.
- **Match Hub (Stadium Modal):** Deep match statistics, comparison bars, event timelines (goals, cards, substitutions), YouTube highlights search, and Man of the Match awards for completed games.
- **Global Player Scout:** Search players across world football, view calculated scouting ratings ("Fun rating"), and inspect FUT-style player cards with interactive performance bar charts.
- **League Standings:** Live league tables with official qualification and relegation zones direct from competition data.
- **Favorites:** Star matches across any competition to track them in a dedicated tab with persistent storage.
- **Accessibility & Mobile-First Design:** Accessible modals with focus trapping, Escape key closing, keyboard navigation, horizontal swipeable navigation bars, and responsive layouts.

## Tech Stack

- **Framework:** React 18 + Vite
- **Data Fetching & Cache:** TanStack React Query (`@tanstack/react-query`)
- **State Management:** Zustand (`zustand`)
- **Icons:** Lucide React (`lucide-react`)
- **Charts:** Recharts (`recharts`)
- **Notifications:** React Hot Toast (`react-hot-toast`)

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

### Installation

```bash
# Navigate to the project directory
cd Leagues

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

## Data Source & API Notes

Data is sourced from ESPN's public soccer endpoints (`site.api.espn.com`):
- `scoreboard?dates=YYYYMMDD`: Single-day match results and live scores per league.
- `scoreboard?dates=YYYY`: Full calendar year match schedules.
- `summary?event=ID`: Detailed match summary, lineups, box score statistics, and timelines.
- `standings`: League table rankings and official qualification notes.
- `athletes?search=QUERY`: Player search across club rosters.

> **Note:** ESPN's public API is unauthenticated and rate-limited. Requests are cached via React Query (30-second polling for active live matches, 5-minute stale time for current day fixtures, and 10-minute cache for seasonal schedules).
