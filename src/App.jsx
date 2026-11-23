import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { Routes, Route, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import Header from "./components/Header";
import MatchList from "./components/MatchList";
import LeagueTable from "./components/LeagueTable";
import PlayerSearch from "./components/PlayerSearch";
import DayNavigator from "./components/DayNavigator";
import SiteFooter from "./components/SiteFooter";
import NotFound from "./components/NotFound";
import { useMatches, useTodayMatches, useFavoriteMatches } from "./hooks/useMatches";
import { Radio, Calendar, CheckCircle2, Clock, Star, Search } from "lucide-react";
import SkeletonCard from "./components/SkeletonCard";
import { useAppStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { fromUrlName, LEAGUE_SEO_DATA } from './seo/leagues.js';
import { useDocumentHead } from './hooks/useDocumentHead.js';
import { getTodayDateKey } from './api.js';

const MatchDetailModal = lazy(() => import("./components/MatchDetailModal"));
const PlayerProfileModal = lazy(() => import("./components/PlayerProfileModal"));
const LiveMatchesModal = lazy(() => import("./components/LiveMatchesModal"));
const TeamSidePanel = lazy(() => import("./components/TeamSidePanel"));
const ReplayPage = lazy(() => import("./components/replay/ReplayPage"));
const TacticsBoard = lazy(() => import("./components/tactics/TacticsBoard"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));

function MatchesLayout({
  matches,
  loading,
  isError,
  error,
  refetch,
  failedLeagues,
  selectedLeague,
  selectedSeason,
  selectedDate,
  onDateChange,
  activeTab,
  favoriteMatches,
  loadingFavorites,
  onMatchSelect,
  onPlayerSelect,
}) {
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState("all");
  const { statusFilter, setStatusFilter } = useAppStore(
    useShallow((s) => ({
      statusFilter: s.statusFilter,
      setStatusFilter: s.setStatusFilter,
    }))
  );

  useEffect(() => {
    setSelectedTeamFilter("all");
    setTeamSearchQuery("");
  }, [selectedLeague, selectedSeason, selectedDate]);

  const uniqueTeams = useMemo(() => {
    const teams = new Map();
    matches.forEach((m) => {
      if (m.homeTeam?.name) teams.set(m.homeTeam.name, m.homeTeam.name);
      if (m.awayTeam?.name) teams.set(m.awayTeam.name, m.awayTeam.name);
    });
    return Array.from(teams.values()).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    let result = matches;
    if (statusFilter !== "all") {
      result = result.filter((m) => m.status === statusFilter);
    }
    if (selectedTeamFilter !== "all") {
      result = result.filter(
        (m) =>
          m.homeTeam?.name === selectedTeamFilter ||
          m.awayTeam?.name === selectedTeamFilter
      );
    }
    if (teamSearchQuery.trim() !== "") {
      const query = teamSearchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.homeTeam?.name?.toLowerCase().includes(query) ||
          m.awayTeam?.name?.toLowerCase().includes(query)
      );
    }
    return result;
  }, [matches, statusFilter, selectedTeamFilter, teamSearchQuery]);

  const upcomingMatchesCount = useMemo(
    () => matches.filter((m) => m.status === "upcoming").length,
    [matches]
  );
  const finishedMatchesCount = useMemo(
    () => matches.filter((m) => m.status === "finished").length,
    [matches]
  );

  if (activeTab === "favorites") {
    return (
      <div className="content-layout">
        <div className="filter-pills-bar">
          <div className="filter-pills-group">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.2rem' }}>
              <Star size={20} fill="#ffd700" color="#ffd700" /> 
              My Favorite Matches
            </h2>
          </div>
          <div className="match-results-counter">
            Showing <span>{favoriteMatches.length}</span> saved matches
          </div>
        </div>

        {loadingFavorites ? (
          <div className="match-grid">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : favoriteMatches.length === 0 ? (
          <div className="no-matches" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <p>No favorite matches saved yet. Click the star icon on any match card to save it here.</p>
          </div>
        ) : (
          <MatchList
            matches={favoriteMatches}
            onMatchClick={onMatchSelect}
            groupByLeague={false}
          />
        )}
      </div>
    );
  }

  if (activeTab === "search") {
    return (
      <PlayerSearch
        onPlayerSelect={(id, teamId, leagueSlug) =>
          onPlayerSelect({ id, teamId, leagueSlug })
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="content-layout">
        <div className="match-grid">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="content-layout">
        <div 
          className="error-state-card" 
          style={{ 
            textAlign: 'center', 
            padding: '3rem 1.5rem', 
            margin: '2rem auto', 
            maxWidth: '480px', 
            background: 'var(--pitch-card, #1a1a24)', 
            border: '1px solid var(--accent-danger, #ff3366)', 
            borderRadius: '16px' 
          }}
        >
          <p style={{ color: 'var(--accent-danger, #ff3366)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Unable to load matches
          </p>
          <p style={{ color: 'var(--text-muted, #a0aec0)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {error?.message || "There was a problem loading match data from ESPN."}
          </p>
          <button 
            onClick={() => refetch()}
            className="retry-btn"
            style={{
              padding: '0.65rem 1.8rem',
              borderRadius: '24px',
              background: 'var(--accent-primary, #00ff87)',
              color: '#000',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-layout">
      {failedLeagues.length > 0 && (
        <div style={{
          padding: '0.75rem 1.2rem',
          borderRadius: '12px',
          background: 'rgba(255, 184, 0, 0.1)',
          border: '1px solid rgba(255, 184, 0, 0.3)',
          color: '#ffb800',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem'
        }}>
          <span>⚠️ Some competitions couldn&apos;t load ({failedLeagues.map(l => l.name).join(', ')})</span>
          <button 
            onClick={() => refetch()}
            style={{
              background: 'none',
              border: '1px solid #ffb800',
              color: '#ffb800',
              borderRadius: '6px',
              padding: '3px 10px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Day Navigator (only for All Matches view) */}
      {selectedLeague === 'all' && (
        <DayNavigator selectedDate={selectedDate} onDateChange={onDateChange} />
      )}

      {/* Match Filter Pills Bar */}
      <div className="filter-pills-bar">
        <div className="filter-pills-group">
          <button
            className={`filter-pill ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            <Calendar size={15} /> All Fixtures
            <span className="match-count-badge">
              {matches.length}
            </span>
          </button>
          <button
            className={`filter-pill ${statusFilter === "live" ? "active" : ""}`}
            onClick={() => setStatusFilter("live")}
          >
            <Radio size={15} color="var(--accent-danger)" /> Live Now
            <span className="match-count-badge">
              {matches.filter((m) => m.status === "live").length}
            </span>
          </button>
          <button
            className={`filter-pill ${statusFilter === "upcoming" ? "active" : ""}`}
            onClick={() => setStatusFilter("upcoming")}
          >
            <Clock size={15} /> Upcoming
            <span className="match-count-badge">
              {upcomingMatchesCount}
            </span>
          </button>
          <button
            className={`filter-pill ${statusFilter === "finished" ? "active" : ""}`}
            onClick={() => setStatusFilter("finished")}
          >
            <CheckCircle2 size={15} /> Results
            <span className="match-count-badge">
              {finishedMatchesCount}
            </span>
          </button>
        </div>
        <div className="match-results-counter">
          Showing <span>{filteredMatches.length}</span> of{" "}
          {matches.length} matches
        </div>
      </div>

      {/* Team Search and Dropdown Filter */}
      <div className="team-filter-bar">
        <div className="team-search-wrapper">
          <Search size={16} className="team-search-icon" />
          <input 
            type="text" 
            placeholder="Search for a team..." 
            value={teamSearchQuery}
            onChange={(e) => setTeamSearchQuery(e.target.value)}
            className="team-search-input"
          />
        </div>
        <select 
          value={selectedTeamFilter} 
          onChange={(e) => setSelectedTeamFilter(e.target.value)}
          className="team-select"
        >
          <option value="all">All Teams</option>
          {uniqueTeams.map(team => (
            <option key={team} value={team}>{team}</option>
          ))}
        </select>
        {selectedTeamFilter !== "all" && (
          <div className="active-team-pill">
            <span>🛡️ <strong>{selectedTeamFilter}</strong> Hub</span>
            <button 
              type="button" 
              onClick={() => setSelectedTeamFilter("all")}
              className="clear-team-btn"
              title="Clear team selection"
            >
              ✕ Clear
            </button>
          </div>
        )}
      </div>

      <div className={`matches-view-layout ${selectedTeamFilter !== "all" ? "has-side-panel" : ""}`}>
        <div className="matches-main-column">
          <MatchList
            matches={filteredMatches}
            onMatchClick={onMatchSelect}
            onTeamClick={(team) => setSelectedTeamFilter(team)}
            groupByLeague={selectedLeague === 'all'}
          />
        </div>

        {selectedTeamFilter !== "all" && (
          <aside className="team-side-column">
            <Suspense fallback={null}>
              <TeamSidePanel
                teamName={selectedTeamFilter}
                allMatches={matches}
                selectedLeague={selectedLeague}
                selectedSeason={selectedSeason}
                onClose={() => setSelectedTeamFilter("all")}
                onMatchClick={onMatchSelect}
                onPlayerClick={(id, teamId, leagueSlug) =>
                  onPlayerSelect({ id, teamId, leagueSlug })
                }
              />
            </Suspense>
          </aside>
        )}
      </div>
    </div>
  );
}

// 1. Home Route (/)
function HomeRoute(props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const setSelectedLeague = useAppStore((s) => s.setSelectedLeague);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  useEffect(() => {
    setSelectedLeague('all');
    setActiveTab('matches');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      setSelectedDate(dateParam);
    }
  }, [dateParam, setSelectedLeague, setSelectedDate, setActiveTab]);

  useDocumentHead({ kind: 'home', hasDateQuery: Boolean(dateParam) });

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    if (newDate === getTodayDateKey()) {
      const next = new URLSearchParams(searchParams);
      next.delete('date');
      setSearchParams(next, { replace: true });
    } else {
      setSearchParams({ date: newDate }, { replace: true });
    }
  };

  return (
    <MatchesLayout
      {...props}
      selectedLeague="all"
      onDateChange={handleDateChange}
    />
  );
}

// 2. League Matches Route (/league/:leagueName)
function LeagueMatchesRoute(props) {
  const { leagueName } = useParams();
  const [searchParams] = useSearchParams();
  const setSelectedLeague = useAppStore((s) => s.setSelectedLeague);
  const setSelectedSeason = useAppStore((s) => s.setSelectedSeason);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const espnSlug = fromUrlName(leagueName) || (LEAGUE_SEO_DATA[leagueName] ? leagueName : null);

  useEffect(() => {
    if (espnSlug) {
      setSelectedLeague(espnSlug);
      setActiveTab('matches');
      const seasonParam = searchParams.get('season');
      if (seasonParam) {
        setSelectedSeason(seasonParam);
      }
    }
  }, [espnSlug, searchParams, setSelectedLeague, setSelectedSeason, setActiveTab]);

  useDocumentHead(
    espnSlug
      ? {
          kind: 'league',
          espnSlug,
          name: LEAGUE_SEO_DATA[espnSlug]?.name,
          season: props.selectedSeason,
        }
      : null
  );

  if (!espnSlug) {
    return <NotFound />;
  }

  return (
    <MatchesLayout
      {...props}
      selectedLeague={espnSlug}
    />
  );
}

// 3. League Table Route (/league/:leagueName/table)
function LeagueTableRoute({ matches }) {
  const { leagueName } = useParams();
  const [searchParams] = useSearchParams();
  const setSelectedLeague = useAppStore((s) => s.setSelectedLeague);
  const setSelectedSeason = useAppStore((s) => s.setSelectedSeason);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const selectedSeason = useAppStore((s) => s.selectedSeason);

  const espnSlug = fromUrlName(leagueName) || (LEAGUE_SEO_DATA[leagueName] ? leagueName : null);

  useEffect(() => {
    if (espnSlug) {
      setSelectedLeague(espnSlug);
      setActiveTab('standings');
      const seasonParam = searchParams.get('season');
      if (seasonParam) {
        setSelectedSeason(seasonParam);
      }
    }
  }, [espnSlug, searchParams, setSelectedLeague, setSelectedSeason, setActiveTab]);

  useDocumentHead(
    espnSlug
      ? {
          kind: 'table',
          espnSlug,
          name: LEAGUE_SEO_DATA[espnSlug]?.name,
          season: selectedSeason,
        }
      : null
  );

  if (!espnSlug) {
    return <NotFound />;
  }

  return (
    <div className="content-layout">
      <LeagueTable matches={matches} />
    </div>
  );
}

// 4. Match Route (/match/:id or /match/:id/:slug)
function MatchModalRoute({ matches, todayMatches, onPlayerSelect, ...layoutProps }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const activeMatch = useMemo(() => {
    const foundToday = todayMatches.find((m) => String(m.id) === String(id));
    if (foundToday) return foundToday;
    const foundInMatches = matches.find((m) => String(m.id) === String(id));
    if (foundInMatches) return foundInMatches;
    return { id };
  }, [id, todayMatches, matches]);

  const handleClose = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <MatchesLayout
        {...layoutProps}
        matches={matches}
        onMatchSelect={() => {}}
        onPlayerSelect={onPlayerSelect}
      />
      <Suspense fallback={null}>
        <MatchDetailModal
          match={activeMatch}
          onClose={handleClose}
          onPlayerClick={(pid, teamId, leagueSlug) =>
            onPlayerSelect({ id: pid, teamId, leagueSlug })
          }
        />
      </Suspense>
    </>
  );
}

// 5. Tactics Route (/tactics)
function TacticsRoute() {
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  useEffect(() => {
    setActiveTab('tactics');
  }, [setActiveTab]);

  useDocumentHead({ kind: 'static', page: 'tactics' });

  return (
    <Suspense
      fallback={
        <div className="content-layout" style={{ minHeight: 450, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="replay-spinner" />
        </div>
      }
    >
      <TacticsBoard />
    </Suspense>
  );
}

// 6. Replay Route (/replay)
function ReplayRoute() {
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  useEffect(() => {
    setActiveTab('replay');
  }, [setActiveTab]);

  useDocumentHead({ kind: 'static', page: 'replay' });

  return (
    <Suspense
      fallback={
        <div className="content-layout" style={{ minHeight: 450, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="replay-spinner" />
        </div>
      }
    >
      <ReplayPage />
    </Suspense>
  );
}

function App() {
  const navigate = useNavigate();

  // 1. Get our UI state from Zustand with shallow selector
  const {
    selectedLeague, selectedSeason, selectedDate, selectedPlayer,
    activeTab, showLiveModal, favorites,
    setSelectedDate, setSelectedPlayer, setShowLiveModal,
  } = useAppStore(
    useShallow((state) => ({
      selectedLeague: state.selectedLeague,
      selectedSeason: state.selectedSeason,
      selectedDate: state.selectedDate,
      selectedPlayer: state.selectedPlayer,
      activeTab: state.activeTab,
      showLiveModal: state.showLiveModal,
      favorites: state.favorites,
      setSelectedDate: state.setSelectedDate,
      setSelectedPlayer: state.setSelectedPlayer,
      setShowLiveModal: state.setShowLiveModal,
    }))
  );

  // 2. Fetch matches using centralized React Query hooks
  const { data: matchesData, isLoading: loading, isError, error, refetch } = useMatches({
    league: selectedLeague,
    season: selectedSeason,
    dateKey: selectedDate,
  });

  const matches = useMemo(() => matchesData?.matches ?? [], [matchesData]);
  const failedLeagues = useMemo(() => matchesData?.failedLeagues ?? [], [matchesData]);

  // Shared cached query for today's matches worldwide
  const { data: todayData } = useTodayMatches();
  const todayMatches = useMemo(() => todayData?.matches ?? [], [todayData]);

  // Load favorite matches dynamically by ID across all competitions
  const { matches: favoriteMatches, isLoading: loadingFavorites } = useFavoriteMatches(favorites);

  // Apply dynamic theme to body using classList based on selected league
  useEffect(() => {
    const cleanSlug = (selectedLeague || 'all').replace(/[^a-z0-9]/gi, "").toLowerCase();
    const newThemeClass = `theme-${cleanSlug}`;
    
    const existingThemeClasses = Array.from(document.body.classList).filter(c => c.startsWith('theme-'));
    existingThemeClasses.forEach(c => document.body.classList.remove(c));

    document.body.classList.add(newThemeClass);

    return () => {
      document.body.classList.remove(newThemeClass);
    };
  }, [selectedLeague]);

  // Hash Redirects: #replay -> /replay; /#tactics -> /tactics#tactics
  useEffect(() => {
    if (window.location.hash === '#replay') {
      navigate('/replay', { replace: true });
    } else if (window.location.pathname === '/' && window.location.hash.startsWith('#tactics')) {
      navigate(`/tactics${window.location.hash}`, { replace: true });
    }
  }, [navigate]);

  // Goal Notification Watcher (watching today's live matches worldwide)
  const prevMatchesRef = useRef();
  useEffect(() => {
    if (prevMatchesRef.current && todayMatches.length > 0) {
      todayMatches.forEach((match) => {
        if (match.status === 'live') {
          const prevMatch = prevMatchesRef.current.find((m) => m.id === match.id);
          if (prevMatch && prevMatch.status === 'live') {
            const homeScore = parseInt(match.score?.home || 0, 10);
            const prevHomeScore = parseInt(prevMatch.score?.home || 0, 10);
            const awayScore = parseInt(match.score?.away || 0, 10);
            const prevAwayScore = parseInt(prevMatch.score?.away || 0, 10);
            
            if (homeScore > prevHomeScore) {
              toast.success(`GOAL! ${match.homeTeam?.name || 'Home team'} scored!`, { 
                icon: '⚽', 
                style: { background: '#1e1e24', color: '#fff', border: '1px solid var(--accent-primary)' } 
              });
            }
            if (awayScore > prevAwayScore) {
              toast.success(`GOAL! ${match.awayTeam?.name || 'Away team'} scored!`, { 
                icon: '⚽', 
                style: { background: '#1e1e24', color: '#fff', border: '1px solid var(--accent-secondary)' } 
              });
            }
          }
        }
      });
    }
    prevMatchesRef.current = todayMatches;
  }, [todayMatches]);

  const liveMatchesCount = useMemo(() => {
    return todayMatches.filter((m) => m.status === "live").length;
  }, [todayMatches]);

  const commonProps = {
    matches,
    loading,
    isError,
    error,
    refetch,
    failedLeagues,
    selectedLeague,
    selectedSeason,
    selectedDate,
    onDateChange: setSelectedDate,
    activeTab,
    favoriteMatches,
    loadingFavorites,
    onPlayerSelect: setSelectedPlayer,
  };

  return (
    <div className="app-container">
      <Toaster position="top-right" reverseOrder={false} />
      <Header
        liveCount={liveMatchesCount}
        totalCount={matches.length}
      />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomeRoute {...commonProps} />} />
          <Route path="/league/:leagueName" element={<LeagueMatchesRoute {...commonProps} />} />
          <Route path="/league/:leagueName/table" element={<LeagueTableRoute matches={matches} />} />
          <Route
            path="/match/:id"
            element={
              <MatchModalRoute
                {...commonProps}
                todayMatches={todayMatches}
              />
            }
          />
          <Route
            path="/match/:id/:slug"
            element={
              <MatchModalRoute
                {...commonProps}
                todayMatches={todayMatches}
              />
            }
          />
          <Route path="/team/:id" element={<TeamPage />} />
          <Route path="/team/:id/:slug" element={<TeamPage />} />
          <Route path="/tactics" element={<TacticsRoute />} />
          <Route path="/replay" element={<ReplayRoute />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <SiteFooter />

      <Suspense fallback={null}>
        {selectedPlayer && (
          <PlayerProfileModal
            playerId={selectedPlayer.id}
            teamId={selectedPlayer.teamId}
            leagueSlug={selectedPlayer.leagueSlug}
            season={selectedSeason}
            onClose={() => setSelectedPlayer(null)}
          />
        )}

        {showLiveModal && (
          <LiveMatchesModal
            onClose={() => setShowLiveModal(false)}
            onMatchClick={() => setShowLiveModal(false)}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
