import React, { useState, useEffect } from 'react';
import { X, Loader, Activity, Radio, Shield } from 'lucide-react';
import { fetchEspnMatches } from '../api.jsx';
import './LiveMatchesModal.css';

export default function LiveMatchesModal({ onClose, onMatchClick }) {
  const [groupedLiveMatches, setGroupedLiveMatches] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getLiveMatches = async () => {
      try {
        setLoading(true);
        const data = await fetchEspnMatches('all', '2026'); 
        
        // Filter live matches
        const live = data.filter(m => m.status === 'live');
        
        // Dynamically group by league
        const groups = {};
        live.forEach(m => {
          const leagueName = m.league || 'Other Competitions';
          if (!groups[leagueName]) {
            groups[leagueName] = {
              name: leagueName,
              logo: m.leagueLogo || null,
              matches: []
            };
          }
          groups[leagueName].matches.push(m);
        });

        setGroupedLiveMatches(groups);
        setError(null);
      } catch (err) {
        setError("Failed to fetch live matches.");
      } finally {
        setLoading(false);
      }
    };

    getLiveMatches();
    
    // Poll every 30 seconds
    const intervalId = setInterval(getLiveMatches, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const totalLiveCount = Object.values(groupedLiveMatches).reduce(
    (acc, grp) => acc + grp.matches.length, 
    0
  );

  const renderMatchList = (matches) => {
    if (matches.length === 0) {
      return (
        <div className="no-live-matches">
          No live matches in this competition right now.
        </div>
      );
    }
    
    return (
      <div className="live-matches-grid">
        {matches.map(match => (
          <div 
            key={match.id} 
            className="live-match-card"
            onClick={() => {
              onMatchClick(match);
              onClose();
            }}
          >
            <div className="live-match-top-strip">
              <div className="live-match-time">
                <span className="live-pulse-dot"></span>
                <span>{match.time || 'LIVE'}</span>
              </div>
              <span className="click-to-view-tag">MATCH HUB &gt;</span>
            </div>

            <div className="live-match-teams">
              <div className="live-team-row">
                <div className="live-team-name">
                  <div className="live-team-logo">
                    {match.homeTeam.logo}
                  </div>
                  <span>{match.homeTeam.name}</span>
                </div>
                <span className="live-team-score">{match.score?.home ?? '0'}</span>
              </div>
              <div className="live-team-row">
                <div className="live-team-name">
                  <div className="live-team-logo">
                    {match.awayTeam.logo}
                  </div>
                  <span>{match.awayTeam.name}</span>
                </div>
                <span className="live-team-score">{match.score?.away ?? '0'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{zIndex: 1200}}>
      <div className="modal-content live-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close Live Radar">
          <X size={22} />
        </button>
        
        <div className="live-modal-header">
          <div className="live-modal-title-group">
            <h2 className="live-header-h2">
              <Radio size={24} className="pulse-dot" color="var(--accent-danger)" />
              WORLD MATCHDAY LIVE RADAR
            </h2>
            <p className="live-header-sub">Real-time live scores and minute-by-minute updates across world competitions</p>
          </div>
          <div className="live-counter-pill">
            <span>{totalLiveCount}</span> LIVE NOW
          </div>
        </div>
        
        {loading && !totalLiveCount ? (
          <div className="modal-loading">
            <div className="pitch-loading-spinner">⚽</div>
            <p>Scanning global pitches for active live fixtures...</p>
          </div>
        ) : error ? (
          <div className="modal-error">{error}</div>
        ) : totalLiveCount === 0 ? (
          <div className="no-live-matches" style={{ margin: '2rem 0', textAlign: 'center' }}>
            No live fixtures currently in progress across monitored competitions. Check upcoming fixtures in Fixtures & Results tab!
          </div>
        ) : (
          <div className="live-leagues-container">
            {Object.values(groupedLiveMatches).map(group => (
              <div key={group.name} className="live-league-section">
                <h3 className="live-league-title">
                  {group.logo ? (
                    <img src={group.logo} alt={group.name} style={{ width: 24, height: 24, objectFit: 'contain' }} />
                  ) : (
                    <Shield size={20} color="var(--accent-primary)" />
                  )}
                  {group.name}
                  <span className="league-live-tag">{group.matches.length} LIVE</span>
                </h3>
                {renderMatchList(group.matches)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

