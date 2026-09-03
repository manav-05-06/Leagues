import React from 'react';
import { Trophy, Search, Activity, Radio, Calendar, Table2, Star } from 'lucide-react';
import { useAppStore } from '../store';

const LEAGUES = [
  { id: 'all', name: 'All Leagues', icon: '⚽' },
  { id: 'eng.1', name: 'Premier League', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/23.png' },
  { id: 'esp.1', name: 'La Liga', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/15.png' },
  { id: 'ger.1', name: 'Bundesliga', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/10.png' }
];

export default function Header({ liveCount = 0, totalCount = 0 }) {
  // Pull what we need directly from our Zustand store
  const { 
    selectedLeague, setSelectedLeague, 
    selectedSeason, setSelectedSeason, 
    activeTab, setActiveTab, 
    setShowLiveModal 
  } = useAppStore();

  // ... rest of the component stays exactly the same
  return (
    <header className="header">
      {/* Top Matchday Live Ticker */}
      <div className="matchday-ticker-bar">
        <div className="ticker-left">
          <span className="ticker-badge">
            <Radio size={14} className="pulse-dot" /> MATCHDAY LIVE
          </span>
          <span className="ticker-text">
            {liveCount > 0 
              ? `${liveCount} LIVE FIXTURE${liveCount > 1 ? 'S' : ''} IN PROGRESS ACROSS EUROPE`
              : 'EUROPEAN FOOTBALL FIXTURES & RESULTS'
            }
          </span>
        </div>
        <div className="ticker-league-stats">
          <div className="ticker-stat-item">
            <span>SEASON:</span>
            <strong>{selectedSeason}-{parseInt(selectedSeason) + 1}</strong>
          </div>
          <div className="ticker-stat-item">
            <span>FIXTURES LOADED:</span>
            <strong>{totalCount}</strong>
          </div>
        </div>
      </div>

      {/* Main Brand Section & League Switchers */}
      <div className="header-top-row">
        <div className="brand-section">
          <div className="brand-logo-crest">
            ⚽
          </div>
          <div className="brand-title-group">
            <h1>Matchday Arena</h1>
            <div className="brand-tagline">Elite Football & League Center</div>
          </div>
        </div>

        {/* League Selector Badge Cards */}
        <div className="league-selector-bar">
          {LEAGUES.map(league => (
            <button
              key={league.id}
              className={`league-btn-badge ${selectedLeague === league.id ? 'active' : ''}`}
              onClick={() => setSelectedLeague(league.id)}
            >
              {league.logo ? (
                <img src={league.logo} alt={league.name} />
              ) : (
                <span className="league-icon">{league.icon}</span>
              )}
              <span>{league.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Tabs & Header Controls */}
      <div className="header-controls">
        <div className="nav-tabs">
          <button 
            className={`nav-tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            <Calendar size={18} /> Fixtures & Results
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'standings' ? 'active' : ''}`}
            onClick={() => setActiveTab('standings')}
          >
            <Table2 size={18} /> Standings
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Search size={18} /> Player Scout (FUT)
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            <Star size={18} /> My Favorites
          </button>
        </div>

        <div className="header-action-group">
          <select 
            value={selectedSeason} 
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="season-select-styled"
            title="Select Season"
          >
            <option value="2026">2026-27 Season</option>
            <option value="2025">2025-26 Season</option>
            <option value="2024">2024-25 Season</option>
            <option value="2023">2023-24 Season</option>
            <option value="2022">2022-23 Season</option>
          </select>

          <button 
            className="live-indicator-btn" 
            onClick={() => setShowLiveModal(true)}
          >
            <div className="pulse-dot"></div>
            LIVE RADAR
          </button>
        </div>
      </div>
    </header>
  );
}

