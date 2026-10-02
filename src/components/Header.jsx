import React, { useState } from 'react';
import { Trophy, Search, Activity, Radio, Calendar, Table2, Star, Globe, Award, Shield, Flame } from 'lucide-react';
import { useAppStore } from '../store';

export const LEAGUE_CATEGORIES = [
  { id: 'all', label: 'All Competitions', icon: Trophy },
  { id: 'top', label: 'Top European', icon: Shield },
  { id: 'cups', label: 'European & Continental Cups', icon: Award },
  { id: 'international', label: 'International', icon: Globe },
  { id: 'global', label: 'Global Leagues', icon: Flame },
];

export const ALL_LEAGUES = [
  // All Featured
  { id: 'all', name: 'All Matches', category: 'all', icon: '⚽' },

  // European & Continental Cups
  { id: 'uefa.champions', name: 'Champions League', category: 'cups', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/2.png' },
  { id: 'uefa.europa', name: 'Europa League', category: 'cups', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/2310.png' },
  { id: 'uefa.europa.conf', name: 'Conference League', category: 'cups', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/20296.png' },
  { id: 'conmebol.libertadores', name: 'Copa Libertadores', category: 'cups', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/58.png' },
  { id: 'eng.fa', name: 'FA Cup', category: 'cups', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/40.png' },
  { id: 'esp.copa_del_rey', name: 'Copa del Rey', category: 'cups', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/80.png' },

  // Top Domestic Leagues
  { id: 'eng.1', name: 'Premier League', category: 'top', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/23.png' },
  { id: 'esp.1', name: 'La Liga', category: 'top', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/15.png' },
  { id: 'ita.1', name: 'Serie A', category: 'top', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/12.png' },
  { id: 'ger.1', name: 'Bundesliga', category: 'top', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/10.png' },
  { id: 'fra.1', name: 'Ligue 1', category: 'top', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/9.png' },
  { id: 'ned.1', name: 'Eredivisie', category: 'top', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/11.png' },
  { id: 'por.1', name: 'Primeira Liga', category: 'top', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/14.png' },

  // International Tournaments
  { id: 'uefa.nations', name: 'UEFA Nations League', category: 'international', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/2395.png' },
  { id: 'fifa.world', name: 'FIFA World Cup', category: 'international', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/4.png' },
  { id: 'uefa.euro', name: 'UEFA Euro', category: 'international', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/53.png' },
  { id: 'fifa.friendly', name: 'Intl Friendlies', category: 'international', icon: '🌍' },

  // Global Leagues
  { id: 'usa.1', name: 'MLS', category: 'global', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/19.png' },
  { id: 'ksa.1', name: 'Saudi Pro League', category: 'global', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/2488.png' },
];

export default function Header({ liveCount = 0, totalCount = 0 }) {
  // Pull what we need directly from our Zustand store
  const { 
    selectedLeague, setSelectedLeague, 
    selectedSeason, setSelectedSeason, 
    activeTab, setActiveTab, 
    setShowLiveModal 
  } = useAppStore();

  const [selectedCategory, setSelectedCategory] = useState('all');

  // Filter visible league badges based on category
  const visibleLeagues = selectedCategory === 'all' 
    ? ALL_LEAGUES 
    : ALL_LEAGUES.filter(l => l.category === selectedCategory || l.id === 'all');

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
              ? `${liveCount} LIVE FIXTURE${liveCount > 1 ? 'S' : ''} IN PROGRESS WORLDWIDE`
              : 'WORLD FOOTBALL FIXTURES & RESULTS'
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
            <div className="brand-tagline">Worldwide Football & Competition Center</div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="category-filter-bar">
          {LEAGUE_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                className={`category-pill-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <Icon size={14} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* League Selector Badge Cards */}
      <div className="league-selector-bar">
        {visibleLeagues.map(league => (
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

