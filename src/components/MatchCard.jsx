import { Link } from 'react-router-dom';
import { Trophy, Radio, Clock, CheckCircle2, Star } from 'lucide-react';
import { useAppStore } from '../store';
import TeamLogo from './TeamLogo';
import { formatKickoff } from '../api';
import { paths } from '../routes.js';

export default function MatchCard({ match, onClick, onTeamClick }) {
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const isFavorite = favorites.includes(match.id);

  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';
  const isPostponed = match.status === 'postponed';

  let statusText = 'UPCOMING';
  let statusIcon = <Clock size={12} />;
  let statusClass = 'status-upcoming';

  if (isLive) {
    statusText = match.statusDetail || match.time || 'LIVE';
    statusIcon = <Radio size={12} className="pulse-dot" />;
    statusClass = 'status-live';
  } else if (isFinished) {
    statusText = match.statusDetail && match.statusDetail !== 'FT' ? match.statusDetail : 'FULL TIME';
    statusIcon = <CheckCircle2 size={12} />;
    statusClass = 'status-finished';
  } else if (isPostponed) {
    statusText = match.statusDetail || 'POSTPONED';
    statusIcon = <Clock size={12} />;
    statusClass = 'status-upcoming';
  }

  // Extract recent goal scorers from match.details if available
  const goalEvents = (match.details || []).filter(d => d.scoringPlay);

  return (
    <Link 
      to={paths.match(match)}
      className={`match-card ${isLive ? 'is-live' : ''}`} 
      style={{ textDecoration: 'none', color: 'inherit' }}
      onClick={() => {
        onClick?.(match);
      }}
    >
      <div className="match-header">
        <div className="league-info">
          {match.leagueLogo ? (
            <img 
              src={match.leagueLogo} 
              alt={match.league} 
              style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }} 
            />
          ) : (
            <Trophy size={14} color="var(--accent-primary)" />
          )}
          <span>{match.league}</span>
          
          <button 
            type="button"
            className="favorite-btn"
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={isFavorite}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(match.id);
            }}
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', 
              color: isFavorite ? '#ffd700' : 'var(--text-muted)',
              marginLeft: '8px', display: 'flex', alignItems: 'center'
            }}
          >
            <Star size={16} fill={isFavorite ? '#ffd700' : 'none'} />
          </button>
        </div>
        <div className={`match-status-badge ${statusClass}`}>
          {statusIcon}
          <span>{statusText}</span>
        </div>
      </div>

      <div className="match-content">
        <div 
          className={`team ${onTeamClick ? 'clickable-team' : ''}`}
          onClick={(e) => {
            if (onTeamClick && match.homeTeam?.name) {
              e.preventDefault();
              e.stopPropagation();
              onTeamClick(match.homeTeam.name);
            }
          }}
          title={onTeamClick ? `View ${match.homeTeam?.name} Team Hub` : undefined}
        >
          <div className="team-logo-shield">
            <TeamLogo logo={match.homeTeam?.logoUrl || match.homeTeam?.logo} name={match.homeTeam?.name} />
          </div>
          <div className="team-name">{match.homeTeam?.name}</div>
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
            {isLive
              ? '⚽ Match in Progress'
              : isFinished
                ? (match.statusDetail || 'FT')
                : isPostponed
                  ? (match.statusDetail || 'Postponed')
                  : (match.kickoff ? formatKickoff(match.kickoff) : match.time)}
          </div>
        </div>

        <div 
          className={`team ${onTeamClick ? 'clickable-team' : ''}`}
          onClick={(e) => {
            if (onTeamClick && match.awayTeam?.name) {
              e.preventDefault();
              e.stopPropagation();
              onTeamClick(match.awayTeam.name);
            }
          }}
          title={onTeamClick ? `View ${match.awayTeam?.name} Team Hub` : undefined}
        >
          <div className="team-logo-shield">
            <TeamLogo logo={match.awayTeam?.logoUrl || match.awayTeam?.logo} name={match.awayTeam?.name} />
          </div>
          <div className="team-name">{match.awayTeam?.name}</div>
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
    </Link>
  );
}
