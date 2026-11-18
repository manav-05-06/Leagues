import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { Toaster, toast } from "react-hot-toast";
import Header from "./components/Header";
import MatchList from "./components/MatchList";
import LeagueTable from "./components/LeagueTable";
import PlayerSearch from "./components/PlayerSearch";
import DayNavigator from "./components/DayNavigator";
import { useMatches, useTodayMatches, useFavoriteMatches } from "./hooks/useMatches";
import { Radio, Calendar, CheckCircle2, Clock, Star, Search } from "lucide-react";
import SkeletonCard from "./components/SkeletonCard";
import { useAppStore } from './store';
import { useShallow } from 'zustand/react/shallow';

const MatchDetailModal = lazy(() => import("./components/MatchDetailModal"));
const PlayerProfileModal = lazy(() => import("./components/PlayerProfileModal"));
const LiveMatchesModal = lazy(() => import("./components/LiveMatchesModal"));
const TeamSidePanel = lazy(() => import("./components/TeamSidePanel"));

function App() {
  // 1. Get our UI state from Zustand with shallow selector
  const {
    selectedLeague, selectedSeason, selectedDate, selectedMatch, selectedPlayer,
    activeTab, statusFilter, showLiveModal, favorites,
    setSelectedDate, setSelectedMatch, setSelectedPlayer, setStatusFilter, setShowLiveModal,
    setActiveTab
  } = useAppStore(
    useShallow((state) => ({
      selectedLeague: state.selectedLeague,
      selectedSeason: state.selectedSeason,
      selectedDate: state.selectedDate,
      selectedMatch: state.selectedMatch,
      selectedPlayer: state.selectedPlayer,
      activeTab: state.activeTab,
      statusFilter: state.statusFilter,
      showLiveModal: state.showLiveModal,
      favorites: state.favorites,
      setSelectedDate: state.setSelectedDate,
      setSelectedMatch: state.setSelectedMatch,
      setSelectedPlayer: state.setSelectedPlayer,
      setStatusFilter: state.setStatusFilter,
      setShowLiveModal: state.setShowLiveModal,
      setActiveTab: state.setActiveTab,
    }))
  );

  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState("all");

  // 2. Fetch matches using our centralized React Query hooks
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
    const cleanSlug = selectedLeague.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const newThemeClass = `theme-${cleanSlug}`;
    
    // Remove existing theme classes
    const existingThemeClasses = Array.from(document.body.classList).filter(c => c.startsWith('theme-'));
    existingThemeClasses.forEach(c => document.body.classList.remove(c));

    document.body.classList.add(newThemeClass);

    return () => {
      document.body.classList.remove(newThemeClass);
    };
  }, [selectedLeague]);

  // Reset team filter and search query when league, season, or date changes
  useEffect(() => {
    setSelectedTeamFilter("all");
    setTeamSearchQuery("");
  }, [selectedLeague, selectedSeason, selectedDate]);

  // Goal Notification Watcher (watching today's live matches worldwide)
  const prevMatchesRef = useRef();
  useEffect(() => {
    if (prevMatchesRef.current && todayMatches.length > 0) {
      todayMatches.forEach(match => {
        if (match.status === 'live') {
          const prevMatch = prevMatchesRef.current.find(m => m.id === match.id);
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

  // Derive the active match dynamically (checking current matches list and today matches)
  const activeMatch = useMemo(() => {
    if (!selectedMatch) return null;
    const freshToday = todayMatches.find((m) => m.id === selectedMatch.id);
    if (freshToday) return freshToday;
    const freshInMatches = matches.find((m) => m.id === selectedMatch.id);
    if (freshInMatches) return freshInMatches;
    return selectedMatch;
  }, [selectedMatch, todayMatches, matches]);

  // Get unique teams for the dropdown
  const uniqueTeams = useMemo(() => {
    const teams = new Map();
    matches.forEach(m => {
      if (m.homeTeam?.name) teams.set(m.homeTeam.name, m.homeTeam.name);
      if (m.awayTeam?.name) teams.set(m.awayTeam.name, m.awayTeam.name);
    });
    return Array.from(teams.values()).sort();
  }, [matches]);

  // Filter matches based on status, search query, and team dropdown
  const filteredMatches = useMemo(() => {
    let result = matches;
    if (statusFilter !== "all") {
      result = result.filter(m => m.status === statusFilter);
    }
    if (selectedTeamFilter !== "all") {
      result = result.filter(m => 
        m.homeTeam?.name === selectedTeamFilter || 
        m.awayTeam?.name === selectedTeamFilter
      );
    }
    if (teamSearchQuery.trim() !== "") {
      const query = teamSearchQuery.toLowerCase();
      result = result.filter(m => 
        m.homeTeam?.name?.toLowerCase().includes(query) || 
        m.awayTeam?.name?.toLowerCase().includes(query)
      );
    }
    return result;
  }, [matches, statusFilter, selectedTeamFilter, teamSearchQuery]);

  const liveMatchesCount = useMemo(() => {
    return todayMatches.filter((m) => m.status === "live").length;
  }, [todayMatches]);

  const upcomingMatchesCount = useMemo(() => {
    return matches.filter((m) => m.status === "upcoming").length;
  }, [matches]);

  const finishedMatchesCount = useMemo(() => {
    return matches.filter((m) => m.status === "finished").length;
  }, [matches]);

  return (
    <div className="app-container">
      <Toaster position="top-right" reverseOrder={false} />
      <Header
        liveCount={liveMatchesCount}
        totalCount={matches.length}
      />

      <main className="main-content">
        {activeTab === "matches" && (
          loading ? (
            <div className="content-layout">
              <div className="match-grid">
                {/* Show 8 skeletons to fill the screen nicely */}
                {[...Array(8)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </div>
          ) : isError ? (
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
          ) : (
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
                <DayNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} />
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
                    onMatchClick={(match) => setSelectedMatch(match)}
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
                        onMatchClick={(match) => setSelectedMatch(match)}
                        onPlayerClick={(id, teamId, leagueSlug) =>
                          setSelectedPlayer({ id, teamId, leagueSlug })
                        }
                      />
                    </Suspense>
                  </aside>
                )}
              </div>
            </div>
          )
        )}

        {activeTab === "favorites" && (
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
                onMatchClick={(match) => setSelectedMatch(match)}
                groupByLeague={false}
              />
            )}
          </div>
        )}

        {activeTab === "standings" && (
          <div className="content-layout">
            <LeagueTable 
              matches={matches} 
              onTeamSelect={(teamName) => {
                setSelectedTeamFilter(teamName);
                setActiveTab("matches");
              }}
            />
          </div>
        )}

        {activeTab === "search" && (
          <PlayerSearch
            onPlayerSelect={(id, teamId, leagueSlug) =>
              setSelectedPlayer({ id, teamId, leagueSlug })
            }
          />
        )}
      </main>

      <Suspense fallback={null}>
        {activeMatch && (
          <MatchDetailModal
            match={activeMatch}
            onClose={() => setSelectedMatch(null)}
            onPlayerClick={(id, teamId, leagueSlug) =>
              setSelectedPlayer({ id, teamId, leagueSlug })
            }
          />
        )}

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
            onMatchClick={(match) => {
              setSelectedMatch(match);
            }}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
