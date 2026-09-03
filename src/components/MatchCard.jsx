import React from 'react';
import { Trophy, Radio, Clock, CheckCircle2 } from 'lucide-react';

export default function MatchCard({ match, onClick }) {
  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';

  let statusText = 'UPCOMING';
  let statusIcon = <Clock size={12} />;
  let statusClass = 'status-upcoming';

  if (isLive) {
    statusText = match.time ? `${match.time}` : 'LIVE';
    statusIcon = <Radio size={12} className="pulse-dot" />;
    statusClass = 'status-live';
  } else if (isFinished) {
    statusText = 'FULL TIME';
    statusIcon = <CheckCircle2 size={12} />;
    statusClass = 'status-finished';
  }

  // Extract recent goal scorers from match.details if available
  const goalEvents = (match.details || []).filter(d => d.scoringPlay);

  return (
    <div 
      className={`match-card ${isLive ? 'is-live' : ''}`} 
      onClick={onClick}
    >
      <div className="match-header">
        <div className="league-info">
          <Trophy size={14} color="var(--accent-primary)" />
          <span>{match.league}</span>
        </div>
        <div className={`match-status-badge ${statusClass}`}>
          {statusIcon}
          <span>{statusText}</span>
        </div>
      </div>

      <div className="match-content">
        <div className="team">
          <div className="team-logo-shield">{match.homeTeam.logo}</div>
          <div className="team-name">{match.homeTeam.name}</div>
        </div>

        <div className="match-scoreboard-center">
          {isLive || isFinished ? (
            <div className="scoreboard-display">
              <span className={`score-num ${isLive ? 'live' : ''}`}>{match.score?.home ?? '0'}</span>
              <span className="score-divider">:</span>
              <span className={`score-num ${isLive ? 'live' : ''}`}>{match.score?.away ?? '0'}</span>
            </div>
          ) : (
            <div className="scoreboard-display">
              <span className="vs-badge">VS</span>
            </div>
          )}

          <div className={`match-time-sub ${isLive ? 'live-pulse' : ''}`}>
            {isLive ? `⚽ Match in Progress` : (isFinished ? 'FT' : match.time)}
          </div>
        </div>

        <div className="team">
          <div className="team-logo-shield">{match.awayTeam.logo}</div>
          <div className="team-name">{match.awayTeam.name}</div>
        </div>
      </div>

      {goalEvents.length > 0 && (
        <div className="match-card-footer">
          <div className="goal-scorers-preview" title={goalEvents.map(g => `${g.athletesInvolved?.[0]?.shortName || 'Goal'} (${g.clock?.displayValue})`).join(', ')}>
            ⚽ <strong>Goals:</strong> {goalEvents.slice(0, 2).map(g => `${g.athletesInvolved?.[0]?.shortName || 'Goal'} ${g.clock?.displayValue}`).join(', ')}
            {goalEvents.length > 2 ? ` +${goalEvents.length - 2} more` : ''}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>STATS &gt;</span>
        </div>
      )}
    </div>
  );
}

