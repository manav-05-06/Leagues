import React, { useState, useEffect } from 'react';
import { X, Activity, Users, History, Loader, Award, Shield, Radio, Trophy, Timer } from 'lucide-react';
import { fetchMatchSummary } from '../api.jsx';
import './MatchDetailModal.css';

export default function MatchDetailModal({ match, onClose, onPlayerClick }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setLoading(true);
        const data = await fetchMatchSummary(match.id);
        setSummary(data);
      } catch (err) {
        setError('Failed to load deep match statistics.');
      } finally {
        setLoading(false);
      }
    };
    loadSummary();
  }, [match.id]);

  if (!match) return null;

  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';

  const renderContent = () => {
    if (loading) {
      return (
        <div className="modal-loading">
          <div className="pitch-loading-spinner">⚽</div>
          <p>Analyzing Live Pitch Feeds & Tactical Data...</p>
        </div>
      );
    }
    if (error) {
      return <div className="modal-error">{error}</div>;
    }

    const team1 = summary?.boxscore?.teams?.[0];
    const team2 = summary?.boxscore?.teams?.[1];
    const headToHead = summary?.seasonseries?.[0]?.events || [];

    const getManOfTheMatch = () => {
      if (!summary?.leaders) return null;
      let motm = null;

      const findLeader = (categoryName) => {
        let best = null;
        let maxVal = 0;
        summary.leaders.forEach(teamData => {
          const cat = teamData.leaders?.find(c => c.name === categoryName);
          if (cat && cat.leaders && cat.leaders.length > 0) {
            const leader = cat.leaders[0];
            const val = parseFloat(leader.mainStat?.value || leader.value || leader.displayValue || 0);
            if (val > maxVal) {
              maxVal = val;
              best = {
                id: leader.athlete?.id,
                teamId: teamData.team?.id,
                name: leader.athlete?.displayName || leader.athlete?.shortName,
                team: teamData.team?.displayName,
                val: val,
                reason: `${val} ${cat.displayName}`,
                image: leader.athlete?.headshot?.href || (leader.athlete?.jerseyImage && leader.athlete?.jerseyImage[0]?.href)
              };
            }
          }
        });
        return best;
      };

      motm = findLeader('goalsLeaders');
      if (!motm) motm = findLeader('assistsLeaders');
      if (!motm) motm = findLeader('saves');
      if (!motm) motm = findLeader('accuratePasses');
      if (!motm) motm = findLeader('totalShots');
      
      return motm;
    };

    const motm = getManOfTheMatch();
    const motmRating = motm ? Math.min(9.9, (8.2 + ((parseFloat(motm.val) || 1) * 0.4))).toFixed(1) : '8.8';

    return (
      <div className="modal-body">
        {/* Man of the Match Golden Card */}
        {motm && (
          <div className="detail-section motm-section">
            <div className="section-title-wrapper">
              <h3 className="section-title motm-header-title">
                <Trophy size={20} color="var(--accent-gold)" /> 
                <span>MAN OF THE MATCH</span>
              </h3>
              <span className="motm-badge-pill">★ HIGHEST MATCH RATING</span>
            </div>
            
            <div className="motm-content">
              <div className="motm-image-frame">
                {motm.image ? (
                  <img src={motm.image} alt={motm.name} className="motm-image" />
                ) : (
                  <div className="motm-image-placeholder">⚽</div>
                )}
                <div className="motm-star-tag">★ {motmRating}</div>
              </div>

              <div className="motm-info">
                <div 
                  className="motm-name clickable-player" 
                  onClick={() => onPlayerClick && onPlayerClick(motm.id, motm.teamId, match.leagueSlug)}
                  title="View Scout Profile"
                >
                  {motm.name}
                </div>
                <div className="motm-team">🛡️ {motm.team}</div>
                <div className="motm-reason">🎯 {motm.reason}</div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Summary with Comparison Bars */}
        {team1?.statistics && (
          <div className="detail-section">
            <h3 className="section-title">
              <Activity size={18} color="var(--accent-primary)" /> 
              <span>Match Statistics</span>
            </h3>
            <div className="stats-comparison">
              {team1.statistics.map((stat, idx) => {
                const stat2 = team2?.statistics?.[idx];
                const val1 = parseFloat(stat.displayValue) || 0;
                const val2 = parseFloat(stat2?.displayValue) || 0;
                const total = val1 + val2;
                const pct1 = total > 0 ? (val1 / total) * 100 : 50;

                return (
                  <div key={stat.name || idx} className="stat-comparison-block">
                    <div className="stat-row">
                      <span className="stat-value home">{stat.displayValue}</span>
                      <span className="stat-label">{stat.label}</span>
                      <span className="stat-value away">{stat2?.displayValue || '0'}</span>
                    </div>
                    {/* Visual Comparison Bar */}
                    <div className="stat-bar-track">
                      <div className="stat-bar-home" style={{ width: `${pct1}%` }}></div>
                      <div className="stat-bar-away" style={{ width: `${100 - pct1}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Head to Head History */}
        {headToHead && headToHead.length > 0 && (
          <div className="detail-section">
            <h3 className="section-title">
              <History size={18} color="var(--accent-secondary)" /> 
              <span>Head-to-Head History</span>
            </h3>
            <div className="form-container">
              {headToHead.map((h2hMatch) => {
                const home = h2hMatch.competitors?.find(c => c.homeAway === 'home');
                const away = h2hMatch.competitors?.find(c => c.homeAway === 'away');
                const matchDate = new Date(h2hMatch.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                
                return (
                  <div key={h2hMatch.id} className="h2h-match-card">
                    <div className="h2h-team left">
                      {home?.team?.logo && <img src={home.team.logo} alt={home.team.abbreviation} width={26} height={26} />}
                      <span className={home?.winner ? "winner-text" : ""}>{home?.team?.abbreviation || home?.team?.name}</span>
                    </div>
                    <div className="h2h-score-col">
                      <div className="h2h-score-box">
                        <span>{home?.score ?? '0'}</span>
                        <span>-</span>
                        <span>{away?.score ?? '0'}</span>
                      </div>
                      <span className="h2h-date">{matchDate}</span>
                    </div>
                    <div className="h2h-team right">
                      <span className={away?.winner ? "winner-text" : ""}>{away?.team?.abbreviation || away?.team?.name}</span>
                      {away?.team?.logo && <img src={away.team.logo} alt={away.team.abbreviation} width={26} height={26} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Leaders / Top Performers */}
        {summary?.leaders && summary.leaders.length > 0 && (
          <div className="detail-section">
            <h3 className="section-title">
              <Users size={18} color="var(--accent-primary)" /> 
              <span>Top Pitch Performers</span>
            </h3>
            <div className="leaders-grid">
              {summary.leaders.map((teamLeaders, idx) => (
                <div key={idx} className="team-leader-column">
                  <div className="team-leader-club">{teamLeaders.team?.displayName}</div>
                  {teamLeaders.leaders?.map((leaderCat) => (
                    <div key={leaderCat.name} className="leader-category-row">
                      <span className="leader-category-name">{leaderCat.displayName}:</span>
                      <div className="leader-names-list">
                        {leaderCat.leaders?.slice(0, 2).map((l, i) => (
                          <span 
                            key={i} 
                            className="leader-name-pill clickable-player"
                            onClick={() => l.athlete?.id && onPlayerClick && onPlayerClick(l.athlete.id, teamLeaders.team.id, match.leagueSlug)}
                          >
                            {l.athlete?.shortName || l.athlete?.displayName} <strong>({l.displayValue})</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content stadium-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close Matchday View">
          <X size={22} />
        </button>
        
        {/* Stadium Broadcast Scoreboard Header */}
        <div className="stadium-match-header">
          <div className="tactical-pitch-lines"></div>

          <div className="modal-team home">
            <div className="modal-logo-wrapper">
              {match.homeTeam.logo}
            </div>
            <h2>{match.homeTeam.name}</h2>
          </div>
          
          <div className="modal-score">
            <div className={`modal-status-pill status-${match.status}`}>
              {isLive ? (
                <>
                  <Radio size={12} className="pulse-dot" /> LIVE {match.time ? `• ${match.time}` : ''}
                </>
              ) : isFinished ? (
                'FULL TIME'
              ) : (
                <><Timer size={12} /> {match.time || 'UPCOMING'}</>
              )}
            </div>
            <div className="score-numbers-broadcast">
              {match.status !== 'upcoming' ? (
                <>
                  <span className="score-digit">{match.score?.home ?? '0'}</span>
                  <span className="score-separator">:</span>
                  <span className="score-digit">{match.score?.away ?? '0'}</span>
                </>
              ) : (
                <span className="vs-large">VS</span>
              )}
            </div>
            <span className="match-league-sub">{match.league}</span>
          </div>

          <div className="modal-team away">
            <div className="modal-logo-wrapper">
              {match.awayTeam.logo}
            </div>
            <h2>{match.awayTeam.name}</h2>
          </div>
        </div>
        
        {/* Match Goals & Scorers Bar */}
        {match.details && match.details.some(d => d.scoringPlay) && (
          <div className="match-goals-container">
            <div className="match-goals-column">
              {match.details.filter(g => g.scoringPlay && g.team?.id === match.homeTeamId).map((g, i) => {
                const athlete = g.athletesInvolved?.[0];
                return (
                  <div key={i} className="goal-event">
                    <span className="goal-icon">⚽</span>
                    <span 
                      className={athlete?.id ? "clickable-player goal-player" : "goal-player"} 
                      onClick={() => athlete?.id && onPlayerClick && onPlayerClick(athlete.id, g.team.id, match.leagueSlug)}
                    >
                      {athlete?.shortName || athlete?.displayName || 'Goal'}
                    </span> 
                    <span className="goal-time">{g.clock?.displayValue}</span>
                    {g.ownGoal && <span className="goal-meta">(OG)</span>}
                    {g.penaltyKick && <span className="goal-meta">(PEN)</span>}
                  </div>
                );
              })}
            </div>
            <div className="match-goals-column right">
              {match.details.filter(g => g.scoringPlay && g.team?.id === match.awayTeamId).map((g, i) => {
                const athlete = g.athletesInvolved?.[0];
                return (
                  <div key={i} className="goal-event">
                    <span className="goal-time">{g.clock?.displayValue}</span> 
                    <span 
                      className={athlete?.id ? "clickable-player goal-player" : "goal-player"} 
                      onClick={() => athlete?.id && onPlayerClick && onPlayerClick(athlete.id, g.team.id, match.leagueSlug)}
                    >
                      {athlete?.shortName || athlete?.displayName || 'Goal'}
                    </span>
                    <span className="goal-icon">⚽</span>
                    {g.ownGoal && <span className="goal-meta">(OG)</span>}
                    {g.penaltyKick && <span className="goal-meta">(PEN)</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {renderContent()}
      </div>
    </div>
  );
}

