import React, { useState, useEffect } from 'react';
import { X, Loader, Activity, Radio, Shield } from 'lucide-react';
import { fetchEspnMatches } from '../api.jsx';
import './LiveMatchesModal.css';

export default function LiveMatchesModal({ onClose, onMatchClick }) {
  const [liveMatches, setLiveMatches] = useState({
    'Premier League': [],
    'LaLiga': [],
    'German Bundesliga': []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getLiveMatches = async () => {
      try {
        setLoading(true);
        const data = await fetchEspnMatches('all', '2026'); 
        
        // Filter live matches
        const live = data.filter(m => m.status === 'live');
        
        // Group by league
        const grouped = {
          'Premier League': live.filter(m => m.league === 'English Premier League' || m.league === 'Premier League'),
          'LaLiga': live.filter(m => m.league === 'Spanish LALIGA' || m.league === 'LaLiga'),
          'German Bundesliga': live.filter(m => m.league === 'German Bundesliga' || m.league === 'Bundesliga')
        };
        
        // Fallback matching if ESPN league names differ slightly
        live.forEach(m => {
           if (m.league.includes('Premier') && !grouped['Premier League'].includes(m)) grouped['Premier League'].push(m);
           if (m.league.includes('Liga') && !grouped['LaLiga'].includes(m)) grouped['LaLiga'].push(m);
           if (m.league.includes('Bundesliga') && !grouped['German Bundesliga'].includes(m)) grouped['German Bundesliga'].push(m);
        });

        setLiveMatches(grouped);
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

  const totalLiveCount = 
    liveMatches['Premier League'].length + 
    liveMatches['LaLiga'].length + 
    liveMatches['German Bundesliga'].length;

  const renderMatchList = (matches) => {
    if (matches.length === 0) {
      return (
        <div className="no-live-matches">
          No live matches in this league right now. Check back at kickoff!
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
              EUROPEAN MATCHDAY LIVE RADAR
            </h2>
            <p className="live-header-sub">Real-time live scores and minute-by-minute updates across major European leagues</p>
          </div>
          <div className="live-counter-pill">
            <span>{totalLiveCount}</span> LIVE NOW
          </div>
        </div>
        
        {loading && !totalLiveCount ? (
          <div className="modal-loading">
            <div className="pitch-loading-spinner">⚽</div>
            <p>Scanning European pitches for active live fixtures...</p>
          </div>
        ) : error ? (
          <div className="modal-error">{error}</div>
        ) : (
          <div className="live-leagues-container">
            <div className="live-league-section">
              <h3 className="live-league-title">
                <img src="https://a.espncdn.com/i/leaguelogos/soccer/500/23.png" alt="Premier League" />
                Premier League
                {liveMatches['Premier League'].length > 0 && (
                  <span className="league-live-tag">{liveMatches['Premier League'].length} LIVE</span>
                )}
              </h3>
              {renderMatchList(liveMatches['Premier League'])}
            </div>
            
            <div className="live-league-section">
              <h3 className="live-league-title">
                <img src="https://a.espncdn.com/i/leaguelogos/soccer/500/15.png" alt="LaLiga" />
                La Liga
                {liveMatches['LaLiga'].length > 0 && (
                  <span className="league-live-tag">{liveMatches['LaLiga'].length} LIVE</span>
                )}
              </h3>
              {renderMatchList(liveMatches['LaLiga'])}
            </div>
            
            <div className="live-league-section">
              <h3 className="live-league-title">
                <img src="https://a.espncdn.com/i/leaguelogos/soccer/500/10.png" alt="Bundesliga" />
                Bundesliga
                {liveMatches['German Bundesliga'].length > 0 && (
                  <span className="league-live-tag">{liveMatches['German Bundesliga'].length} LIVE</span>
                )}
              </h3>
              {renderMatchList(liveMatches['German Bundesliga'])}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

