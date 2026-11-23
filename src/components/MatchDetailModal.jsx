import { useState } from 'react';
import { Activity, Users, History, Trophy, Timer, PlayCircle, Radio, BarChart2, ClipboardList } from 'lucide-react';
import { useMatchSummary } from '../hooks/useMatches';
import { useAppStore } from '../store';
import TeamLogo from './TeamLogo';
import Modal from './Modal';
import AnalyticsTab from './analytics/AnalyticsTab';
import { formatKickoff } from '../api';
import './MatchDetailModal.css';

export default function MatchDetailModal({ match, onClose, onPlayerClick }) {
  const [activeTab, setActiveTab] = useState('overview');
  const setActiveTabGlobal = useAppStore((s) => s.setActiveTab);
  const setTacticsSeed = useAppStore((s) => s.setTacticsSeed);

  const { data: summary, isLoading: loading, error: queryError } = useMatchSummary(match?.id);
  const error = queryError ? 'Failed to load deep match statistics.' : null;

  if (!match) return null;

  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';

  const handleOpenTacticsBoard = () => {
    setTacticsSeed({
      league: match.leagueSlug || match.league?.slug || 'eng.1',
      eventId: match.id,
      home: {
        id: match.homeTeam?.id,
        name: match.homeTeam?.name,
        color: match.homeTeam?.color,
        altColor: match.homeTeam?.altColor,
        logo: match.homeTeam?.logoUrl || match.homeTeam?.logo,
      },
      away: {
        id: match.awayTeam?.id,
        name: match.awayTeam?.name,
        color: match.awayTeam?.color,
        altColor: match.awayTeam?.altColor,
        logo: match.awayTeam?.logoUrl || match.awayTeam?.logo,
      },
    });
    setActiveTabGlobal('tactics');
    onClose();
  };

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
      if (!isFinished || !summary?.leaders) return null;
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
        {/* Man of the Match Golden Card (Finished matches only) */}
        {isFinished && motm && (
          <div className="detail-section motm-section">
            <div className="section-title-wrapper">
              <h3 className="section-title motm-header-title">
                <Trophy size={20} color="var(--accent-gold)" /> 
                <span>MAN OF THE MATCH</span>
              </h3>
              <span className="motm-badge-pill">★ HIGHEST MATCH RATING (Fun rating)</span>
            </div>
            
            <div className="motm-content">
              <div className="motm-image-frame">
                {motm.image ? (
                  <img src={motm.image} alt={motm.name} className="motm-image" />
                ) : (
                  <div className="motm-image-placeholder">⚽</div>
                )}
                <div className="motm-star-tag" title="Fun rating">
                  ★ {motmRating} <span style={{ fontSize: '0.65rem', opacity: 0.85, fontWeight: 500 }}>(Fun rating)</span>
                </div>
              </div>

              <div className="motm-info">
                <div 
                  className="motm-name clickable-player" 
                  role="button"
                  tabIndex={0}
                  onClick={() => onPlayerClick && onPlayerClick(motm.id, motm.teamId, match.leagueSlug)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPlayerClick && onPlayerClick(motm.id, motm.teamId, match.leagueSlug);
                    }
                  }}
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
              <span>{isFinished ? 'Top Pitch Performers' : 'Season Leaders'}</span>
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
                            role="button"
                            tabIndex={0}
                            onClick={() => l.athlete?.id && onPlayerClick && onPlayerClick(l.athlete.id, teamLeaders.team.id, match.leagueSlug)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                l.athlete?.id && onPlayerClick && onPlayerClick(l.athlete.id, teamLeaders.team.id, match.leagueSlug);
                              }
                            }}
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
    <Modal
      isOpen={Boolean(match)}
      onClose={onClose}
      className="stadium-modal"
      title={`${match.homeTeam?.name || 'Home'} vs ${match.awayTeam?.name || 'Away'}`}
    >
      {/* Stadium Broadcast Scoreboard Header */}
        <div className="stadium-match-header">
          <div className="tactical-pitch-lines"></div>

          <div className="modal-team home">
            <div className="modal-logo-wrapper">
              <TeamLogo logo={match.homeTeam?.logoUrl || match.homeTeam?.logo} name={match.homeTeam?.name} />
            </div>
            <h2>{match.homeTeam?.name}</h2>
          </div>
          
          <div className="modal-score">
            <div className={`modal-status-pill status-${match.status}`}>
              {isLive ? (
                <>
                  <Radio size={12} className="pulse-dot" /> LIVE {match.statusDetail || match.time ? `• ${match.statusDetail || match.time}` : ''}
                </>
              ) : isFinished ? (
                match.statusDetail && match.statusDetail !== 'FT' ? match.statusDetail : 'FULL TIME'
              ) : match.status === 'postponed' ? (
                match.statusDetail || 'POSTPONED'
              ) : (
                <><Timer size={12} /> {match.kickoff ? formatKickoff(match.kickoff) : (match.time || 'UPCOMING')}</>
              )}
            </div>
            <div className="score-numbers-broadcast">
              {match.status !== 'upcoming' && match.status !== 'postponed' ? (
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
              <TeamLogo logo={match.awayTeam?.logoUrl || match.awayTeam?.logo} name={match.awayTeam?.name} />
            </div>
            <h2>{match.awayTeam?.name}</h2>
          </div>
        </div>

        {/* Overview vs Analytics Tab Switcher & Tactics Board Button */}
        <div className="modal-tab-switch-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="modal-tab-switch-pill">
            <button
              type="button"
              className={`modal-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              type="button"
              className={`modal-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart2 size={14} />
              <span>Analytics</span>
              <span className="modal-tab-tag">xG</span>
            </button>
          </div>

          <button
            type="button"
            className="modal-tab-btn"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(15, 23, 42, 0.7)',
              color: 'var(--accent-secondary, #00f2fe)',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
            onClick={handleOpenTacticsBoard}
            title="Open both lineups on interactive tactics board"
          >
            <ClipboardList size={14} />
            <span>Tactics board</span>
          </button>
        </div>

        {activeTab === 'analytics' ? (
          <div className="analytics-tab-wrapper">
            <AnalyticsTab match={match} onPlayerClick={onPlayerClick} />
          </div>
        ) : (
          <>
            {/* Match Event Timeline */}
            {match.details && match.details.length > 0 && (
              <div className="match-timeline-container">
                <h3 className="section-title" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
                  <Timer size={18} color="var(--accent-primary)" /> <span>Match Timeline</span>
                </h3>
                <div className="timeline-vertical">
                  {match.details
                    .filter(d => d.scoringPlay || d.redCard || d.yellowCard)
                    .map((event, i) => {
                    const isHome = event.team?.id === match.homeTeamId;
                    const athlete = event.athletesInvolved?.[0];
                    const time = event.clock?.displayValue || "?'";
                    
                    let icon = '';
                    let className = '';
                    if (event.scoringPlay) { icon = '⚽'; className = 'timeline-goal'; }
                    else if (event.redCard) { icon = ''; className = 'timeline-red'; }
                    else if (event.yellowCard) { icon = ''; className = 'timeline-yellow'; }
                    
                    if (!className) return null;

                    return (
                      <div key={i} className={`timeline-row ${isHome ? 'home-event' : 'away-event'}`}>
                        {isHome ? (
                          <>
                            <div className="timeline-content left">
                              {event.ownGoal && <span className="goal-meta">(OG)</span>}
                              {event.penaltyKick && <span className="goal-meta">(PEN)</span>}
                              <span 
                                className={athlete?.id ? "clickable-player timeline-player" : "timeline-player"}
                                role={athlete?.id ? "button" : undefined}
                                tabIndex={athlete?.id ? 0 : undefined}
                                onClick={() => athlete?.id && onPlayerClick && onPlayerClick(athlete.id, event.team?.id, match.leagueSlug)}
                                onKeyDown={(e) => {
                                  if ((e.key === 'Enter' || e.key === ' ') && athlete?.id && onPlayerClick) {
                                    e.preventDefault();
                                    onPlayerClick(athlete.id, event.team?.id, match.leagueSlug);
                                  }
                                }}
                              >
                                {athlete?.shortName || athlete?.displayName || 'Unknown'}
                              </span>
                            </div>
                            <div className={`timeline-icon ${className}`}>{icon}</div>
                            <div className="timeline-time">{time}</div>
                            <div className="timeline-content right"></div>
                          </>
                        ) : (
                          <>
                            <div className="timeline-content left"></div>
                            <div className="timeline-time">{time}</div>
                            <div className={`timeline-icon ${className}`}>{icon}</div>
                            <div className="timeline-content right">
                              <span 
                                className={athlete?.id ? "clickable-player timeline-player" : "timeline-player"}
                                role={athlete?.id ? "button" : undefined}
                                tabIndex={athlete?.id ? 0 : undefined}
                                onClick={() => athlete?.id && onPlayerClick && onPlayerClick(athlete.id, event.team?.id, match.leagueSlug)}
                                onKeyDown={(e) => {
                                  if ((e.key === 'Enter' || e.key === ' ') && athlete?.id && onPlayerClick) {
                                    e.preventDefault();
                                    onPlayerClick(athlete.id, event.team?.id, match.leagueSlug);
                                  }
                                }}
                              >
                                {athlete?.shortName || athlete?.displayName || 'Unknown'}
                              </span>
                              {event.ownGoal && <span className="goal-meta">(OG)</span>}
                              {event.penaltyKick && <span className="goal-meta">(PEN)</span>}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Match Highlights (Only for Finished Matches) */}
            {isFinished && (
              <div className="match-highlights-container" style={{ margin: '2rem 0' }}>
                <h3 className="section-title" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
                  <PlayCircle size={18} color="#FF0000" /> <span>Official Match Highlights</span>
                </h3>
                <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Watch the official highlights on YouTube.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <a 
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${match.league} ${match.homeTeam.name} vs ${match.awayTeam.name} official highlights`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      backgroundColor: '#FF0000',
                      color: 'white',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '24px',
                      textDecoration: 'none',
                      fontWeight: 'bold',
                      fontSize: '0.95rem',
                      transition: 'background-color 0.2s',
                      boxShadow: '0 4px 6px rgba(255, 0, 0, 0.2)'
                    }}
                  >
                    <PlayCircle size={20} /> Watch on YouTube
                  </a>
                </div>
              </div>
            )}

            {renderContent()}
          </>
        )}
    </Modal>
  );
}

