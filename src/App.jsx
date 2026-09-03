import { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import MatchList from './components/MatchList';
import LeagueTable from './components/LeagueTable';
import MatchDetailModal from './components/MatchDetailModal';
import PlayerProfileModal from './components/PlayerProfileModal';
import PlayerSearch from './components/PlayerSearch';
import LiveMatchesModal from './components/LiveMatchesModal';
import { fetchEspnMatches } from './api.jsx';
import { Radio, Calendar, CheckCircle2, Clock } from 'lucide-react';
import './index.css';

function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState('all');
  const [selectedSeason, setSelectedSeason] = useState('2026');
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [activeTab, setActiveTab] = useState('matches');
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'live' | 'upcoming' | 'finished'

  // Apply dynamic theme to body based on selected league
  useEffect(() => {
    const themeClass = `theme-${selectedLeague.replace('.', '')}`;
    document.body.className = themeClass;
  }, [selectedLeague]);

  // Derive the active match dynamically so it stays up-to-date with background polling
  const activeMatch = matches.find(m => m.id === selectedMatchId);

  useEffect(() => {
    const loadMatches = async (isBackground = false) => {
      try {
        if (!isBackground) setLoading(true);
        const data = await fetchEspnMatches(selectedLeague, selectedSeason);
        const sortedData = data.slice().sort((a, b) => new Date(b.time) - new Date(a.time));
        setMatches(sortedData);
        setError(null);
      } catch (err) {
        if (!isBackground) setError("Failed to load football matchday data. Please check your connection.");
      } finally {
        if (!isBackground) setLoading(false);
      }
    };

    loadMatches();
    
    // Refresh every minute silently in the background
    const intervalId = setInterval(() => loadMatches(true), 60000);
    return () => clearInterval(intervalId);
  }, [selectedLeague, selectedSeason]);

  // Filter matches based on status
  const filteredMatches = useMemo(() => {
    if (statusFilter === 'all') return matches;
    return matches.filter(m => m.status === statusFilter);
  }, [matches, statusFilter]);

  const liveMatchesCount = useMemo(() => {
    return matches.filter(m => m.status === 'live').length;
  }, [matches]);

  const upcomingMatchesCount = useMemo(() => {
    return matches.filter(m => m.status === 'upcoming').length;
  }, [matches]);

  const finishedMatchesCount = useMemo(() => {
    return matches.filter(m => m.status === 'finished').length;
  }, [matches]);

  return (
    <div className="app-container">
      <Header 
        selectedLeague={selectedLeague} 
        onLeagueChange={setSelectedLeague} 
        selectedSeason={selectedSeason}
        onSeasonChange={setSelectedSeason}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLiveClick={() => setShowLiveModal(true)}
        liveCount={liveMatchesCount}
        totalCount={matches.length}
      />

      <main className="main-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner">⚽</div>
            <p>Scanning Matchday Stadium Feeds...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {activeTab === 'matches' && (
              <div className="content-layout">
                {/* Match Filter Pills Bar */}
                <div className="filter-pills-bar">
                  <div className="filter-pills-group">
                    <button 
                      className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('all')}
                    >
                      <Calendar size={15} /> All Fixtures
                      <span className="match-count-badge">{matches.length}</span>
                    </button>
                    <button 
                      className={`filter-pill ${statusFilter === 'live' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('live')}
                    >
                      <Radio size={15} color="var(--accent-danger)" /> Live Now
                      <span className="match-count-badge">{liveMatchesCount}</span>
                    </button>
                    <button 
                      className={`filter-pill ${statusFilter === 'upcoming' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('upcoming')}
                    >
                      <Clock size={15} /> Upcoming
                      <span className="match-count-badge">{upcomingMatchesCount}</span>
                    </button>
                    <button 
                      className={`filter-pill ${statusFilter === 'finished' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('finished')}
                    >
                      <CheckCircle2 size={15} /> Results
                      <span className="match-count-badge">{finishedMatchesCount}</span>
                    </button>
                  </div>
                  <div className="match-results-counter">
                    Showing <span>{filteredMatches.length}</span> of {matches.length} matches
                  </div>
                </div>

                <MatchList matches={filteredMatches} onMatchClick={(match) => setSelectedMatchId(match.id)} />
              </div>
            )}

            {activeTab === 'standings' && (
              <div className="content-layout">
                <LeagueTable matches={matches} />
              </div>
            )}

            {activeTab === 'search' && (
              <PlayerSearch onPlayerSelect={(id, teamId, leagueSlug) => setSelectedPlayer({ id, teamId, leagueSlug })} />
            )}
          </>
        )}
      </main>

      {activeMatch && (
        <MatchDetailModal 
          match={activeMatch} 
          onClose={() => setSelectedMatchId(null)} 
          onPlayerClick={(id, teamId, leagueSlug) => setSelectedPlayer({ id, teamId, leagueSlug })}
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
            setActiveTab('matches');
          }}
        />
      )}
    </div>
  );
}

export default App;

