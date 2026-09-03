import { useState, useEffect, useMemo, useRef } from "react";
import { Toaster, toast } from "react-hot-toast";
import Header from "./components/Header";
import MatchList from "./components/MatchList";
import LeagueTable from "./components/LeagueTable";
import MatchDetailModal from "./components/MatchDetailModal";
import PlayerProfileModal from "./components/PlayerProfileModal";
import PlayerSearch from "./components/PlayerSearch";
import LiveMatchesModal from "./components/LiveMatchesModal";
import { fetchEspnMatches } from "./api.jsx";
import { Radio, Calendar, CheckCircle2, Clock, Star } from "lucide-react";
import "./index.css";
import SkeletonCard from "./components/SkeletonCard";
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from './store';

function App() {
  // 1. Get our UI state from Zustand
  const {
    selectedLeague, selectedSeason, selectedMatchId, selectedPlayer,
    activeTab, statusFilter, showLiveModal, favorites,
    setSelectedMatchId, setSelectedPlayer, setActiveTab, setStatusFilter, setShowLiveModal
  } = useAppStore();

  // 2. Let React Query handle the API fetching, caching, and background refresh!
  const { data: matches = [], isLoading: loading, error } = useQuery({
    queryKey: ['matches', selectedLeague, selectedSeason],
    queryFn: () => fetchEspnMatches(selectedLeague, selectedSeason),
    refetchInterval: 60000, // Silently refresh every 60 seconds
  });

  // Apply dynamic theme to body based on selected league
  useEffect(() => {
    const themeClass = `theme-${selectedLeague.replace(".", "")}`;
    document.body.className = themeClass;
  }, [selectedLeague]);

  // Goal Notification Watcher
  const prevMatchesRef = useRef();
  useEffect(() => {
    if (prevMatchesRef.current && matches.length > 0) {
      matches.forEach(match => {
        if (match.status === 'live') {
          const prevMatch = prevMatchesRef.current.find(m => m.id === match.id);
          if (prevMatch && prevMatch.status === 'live') {
            const homeScore = parseInt(match.score?.home || 0);
            const prevHomeScore = parseInt(prevMatch.score?.home || 0);
            const awayScore = parseInt(match.score?.away || 0);
            const prevAwayScore = parseInt(prevMatch.score?.away || 0);
            
            if (homeScore > prevHomeScore) {
              toast.success(`GOAL! ${match.homeTeam.name} scored!`, { 
                icon: '⚽', 
                style: { background: '#1e1e24', color: '#fff', border: '1px solid var(--accent-primary)' } 
              });
            }
            if (awayScore > prevAwayScore) {
              toast.success(`GOAL! ${match.awayTeam.name} scored!`, { 
                icon: '⚽', 
                style: { background: '#1e1e24', color: '#fff', border: '1px solid var(--accent-secondary)' } 
              });
            }
          }
        }
      });
    }
    prevMatchesRef.current = matches;
  }, [matches]);

  // Derive the active match dynamically
  const activeMatch = matches.find((m) => m.id === selectedMatchId);
  // Filter matches based on status
  const filteredMatches = useMemo(() => {
    if (statusFilter === "all") return matches;
    return matches.filter((m) => m.status === statusFilter);
  }, [matches, statusFilter]);

  const liveMatchesCount = useMemo(() => {
    return matches.filter((m) => m.status === "live").length;
  }, [matches]);

  const upcomingMatchesCount = useMemo(() => {
    return matches.filter((m) => m.status === "upcoming").length;
  }, [matches]);

  const finishedMatchesCount = useMemo(() => {
    return matches.filter((m) => m.status === "finished").length;
  }, [matches]);

  const favoriteMatches = useMemo(() => {
    return matches.filter((m) => favorites?.includes(m.id));
  }, [matches, favorites]);

  return (
    <div className="app-container">
      <Toaster position="top-right" reverseOrder={false} />
      <Header
        liveCount={liveMatchesCount}
        totalCount={matches.length}
      />


      <main className="main-content">
        {loading ? (
          <div className="content-layout">
            <div className="match-grid">
              {/* Show 8 skeletons to fill the screen nicely */}
              {[...Array(8)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {activeTab === "matches" && (
              <div className="content-layout">
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
                        {liveMatchesCount}
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

                <MatchList
                  matches={filteredMatches}
                  onMatchClick={(match) => setSelectedMatchId(match.id)}
                />
              </div>
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

                <MatchList
                  matches={favoriteMatches}
                  onMatchClick={(match) => setSelectedMatchId(match.id)}
                />
              </div>
            )}

            {activeTab === "standings" && (
              <div className="content-layout">
                <LeagueTable matches={matches} />
              </div>
            )}

            {activeTab === "search" && (
              <PlayerSearch
                onPlayerSelect={(id, teamId, leagueSlug) =>
                  setSelectedPlayer({ id, teamId, leagueSlug })
                }
              />
            )}
          </>
        )}
      </main>

      {activeMatch && (
        <MatchDetailModal
          match={activeMatch}
          onClose={() => setSelectedMatchId(null)}
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
            setSelectedMatchId(match.id);
            setActiveTab("matches");
          }}
        />
      )}
    </div>
  );
}

export default App;
