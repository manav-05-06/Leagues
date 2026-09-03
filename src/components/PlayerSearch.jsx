import React, { useState, useEffect } from 'react';
import { Search, Loader, User, Shield, Sparkles, Compass } from 'lucide-react';
import { searchPlayers } from '../api.jsx';
import './PlayerSearch.css';

const QUICK_SCOUT_SUGGESTIONS = [
  'Erling Haaland', 'Kylian Mbappé', 'Jude Bellingham', 'Lamine Yamal', 
  'Vinícius Júnior', 'Mohamed Salah', 'Kevin De Bruyne', 'Harry Kane', 'Bukayo Saka'
];

export default function PlayerSearch({ onPlayerSelect }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch results
  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await searchPlayers(debouncedQuery);
        setResults(data);
      } catch (err) {
        console.error("Scout Search failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  return (
    <div className="player-search-container">
      {/* Scout Hub Header */}
      <div className="scout-hero-header">
        <div className="scout-badge">
          <Compass size={16} color="var(--accent-primary)" />
          <span>GLOBAL PLAYER SCOUT</span>
        </div>
        <h2>Search Any Player in World Football</h2>
        <p>Scout live season statistics, match ratings, and player profiles across European leagues</p>

        <div className="search-input-wrapper">
          <Search className="search-icon" size={22} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by player name (e.g. Haaland, Bellingham, Mbappé)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button className="clear-search-btn" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        {/* Quick Scout Suggestions */}
        <div className="quick-suggestions-bar">
          <span className="suggestions-label"><Sparkles size={14} /> Quick Scout:</span>
          <div className="suggestions-pills">
            {QUICK_SCOUT_SUGGESTIONS.map((name) => (
              <button
                key={name}
                className="suggestion-pill"
                onClick={() => setQuery(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scout Results Area */}
      <div className="search-results-area">
        {loading && (
          <div className="search-status">
            <div className="scout-spinner">⚽</div>
            <p>Scanning European Club Rosters & Scouting DB...</p>
          </div>
        )}
        
        {!loading && debouncedQuery && debouncedQuery.trim().length >= 2 && results.length === 0 && (
          <div className="search-status">
            <p>No football player found for "{debouncedQuery}". Try another name or spelling.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="search-results-grid">
            {results.map((player, idx) => {
              // Calculate deterministic rating based on player ID/name
              let hash = 0;
              const str = String(player.id || player.name || `player-${idx}`);
              for (let i = 0; i < str.length; i++) {
                hash = (hash * 31 + str.charCodeAt(i)) % 1000;
              }
              const ovr = 78 + (hash % 16); // Range 78 - 93

              return (
                <div 
                  key={player.id || idx} 
                  className="scout-player-card"
                  onClick={() => onPlayerSelect(player.id, null, player.leagueSlug)}
                >
                  <div className="scout-card-sheen"></div>
                  
                  <div className="scout-player-top">
                    <div className="scout-player-photo-container">
                      {player.photo ? (
                        <img src={player.photo} alt={player.name} className="scout-player-photo" />
                      ) : (
                        <div className="scout-player-photo-placeholder"><User size={28} /></div>
                      )}
                    </div>
                    <div className="scout-rating-badge">
                      <span>{ovr}</span>
                      <small>OVR</small>
                    </div>
                  </div>

                  <div className="scout-player-info">
                    <h3 className="scout-player-name">{player.name}</h3>
                    <div className="scout-player-team">
                      🛡️ {player.team || 'European Club'}
                    </div>
                    {player.league && (
                      <div className="scout-player-league">
                        🏆 {player.league}
                      </div>
                    )}
                  </div>

                  <div className="scout-card-footer">
                    <span className="view-card-btn">SCOUT REPORT &gt;</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

