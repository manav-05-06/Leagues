import { useMemo, useEffect } from 'react';
import { X, Trophy, Target, Calendar, History, Flame, User } from 'lucide-react';
import TeamLogo from './TeamLogo';
import { formatKickoff } from '../api';
import { useStandings } from '../hooks/useMatches';
import './TeamSidePanel.css';

export default function TeamSidePanel({
  teamName,
  allMatches = [],
  selectedLeague = 'all',
  selectedSeason = '2026',
  onClose,
  onMatchClick,
  onPlayerClick,
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Find all matches involving this team
  const teamMatches = useMemo(() => {
    if (!teamName || teamName === 'all') return [];
    return allMatches.filter(
      (m) => m.homeTeam?.name === teamName || m.awayTeam?.name === teamName
    );
  }, [allMatches, teamName]);

  // Extract team metadata (logo, primary league, teamId)
  const { teamLogo, teamLeague, teamLeagueSlug, teamId } = useMemo(() => {
    let logo = null;
    let league = 'Soccer Competition';
    let slug = selectedLeague !== 'all' ? selectedLeague : 'eng.1';
    let id = null;

    for (const m of teamMatches) {
      if (m.homeTeam?.name === teamName) {
        logo = m.homeTeam?.logoUrl || m.homeTeam?.logo || logo;
        id = m.homeTeamId || id;
      }
      if (m.awayTeam?.name === teamName) {
        logo = m.awayTeam?.logoUrl || m.awayTeam?.logo || logo;
        id = m.awayTeamId || id;
      }
      if (m.league) league = m.league;
      if (m.leagueSlug) slug = m.leagueSlug;
      if (logo && id) break;
    }

    return { teamLogo: logo, teamLeague: league, teamLeagueSlug: slug, teamId: id };
  }, [teamMatches, teamName, selectedLeague]);

  // Fetch official standings for this league and season
  const { data: standingsData } = useStandings(teamLeagueSlug, selectedSeason);

  // Find official standing entry for this team if present
  const teamStanding = useMemo(() => {
    if (!standingsData?.groups) return null;
    const allEntries = standingsData.groups.flatMap((g) => g.entries || []);
    return allEntries.find((e) => {
      const entryName = e.team?.name?.toLowerCase() || '';
      const entryDisplayName = e.team?.displayName?.toLowerCase() || '';
      const target = teamName.toLowerCase();
      return entryName === target || entryDisplayName === target;
    });
  }, [standingsData, teamName]);

  // Partition matches into finished, upcoming, and live
  const { finishedMatches, upcomingMatches, liveMatches } = useMemo(() => {
    const finished = [];
    const upcoming = [];
    const live = [];

    teamMatches.forEach((m) => {
      if (m.status === 'finished') finished.push(m);
      else if (m.status === 'upcoming') upcoming.push(m);
      else if (m.status === 'live') live.push(m);
    });

    // Sort finished: newest first
    finished.sort((a, b) => {
      const timeA = a.kickoff ? new Date(a.kickoff).getTime() : 0;
      const timeB = b.kickoff ? new Date(b.kickoff).getTime() : 0;
      return timeB - timeA;
    });

    // Sort upcoming: soonest first
    upcoming.sort((a, b) => {
      const timeA = a.kickoff ? new Date(a.kickoff).getTime() : Infinity;
      const timeB = b.kickoff ? new Date(b.kickoff).getTime() : Infinity;
      return timeA - timeB;
    });

    return { finishedMatches: finished, upcomingMatches: upcoming, liveMatches: live };
  }, [teamMatches]);

  // Derived match statistics from match scores
  const derivedStats = useMemo(() => {
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    finishedMatches.forEach((m) => {
      const isHome = m.homeTeam?.name === teamName;
      const homeScore = parseInt(m.score?.home ?? '0', 10);
      const awayScore = parseInt(m.score?.away ?? '0', 10);
      const teamScore = isHome ? homeScore : awayScore;
      const oppScore = isHome ? awayScore : homeScore;

      goalsFor += teamScore;
      goalsAgainst += oppScore;

      if (teamScore > oppScore) wins++;
      else if (teamScore === oppScore) draws++;
      else losses++;
    });

    const played = wins + draws + losses;
    const gd = goalsFor - goalsAgainst;
    const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;

    return { played, wins, draws, losses, goalsFor, goalsAgainst, gd, winRate };
  }, [finishedMatches, teamName]);

  // Combined stats (prefer official standings if available)
  const stats = useMemo(() => {
    return {
      played: teamStanding?.stats?.played ?? derivedStats.played,
      wins: teamStanding?.stats?.wins ?? derivedStats.wins,
      draws: teamStanding?.stats?.draws ?? derivedStats.draws,
      losses: teamStanding?.stats?.losses ?? derivedStats.losses,
      goalsFor: teamStanding?.stats?.goalsFor ?? derivedStats.goalsFor,
      goalsAgainst: teamStanding?.stats?.goalsAgainst ?? derivedStats.goalsAgainst,
      gd: teamStanding?.stats?.goalDifference ?? derivedStats.gd,
      points: teamStanding?.stats?.points ?? (derivedStats.wins * 3 + derivedStats.draws),
      rank: teamStanding?.rank ?? null,
      note: teamStanding?.note ?? null,
      winRate: derivedStats.winRate,
    };
  }, [teamStanding, derivedStats]);

  // Form guide (last 5 finished matches)
  const formGuide = useMemo(() => {
    return finishedMatches.slice(0, 5).map((m) => {
      const isHome = m.homeTeam?.name === teamName;
      const opp = isHome ? m.awayTeam?.name : m.homeTeam?.name;
      const homeScore = parseInt(m.score?.home ?? '0', 10);
      const awayScore = parseInt(m.score?.away ?? '0', 10);
      const teamScore = isHome ? homeScore : awayScore;
      const oppScore = isHome ? awayScore : homeScore;

      let result = 'D';
      if (teamScore > oppScore) result = 'W';
      else if (teamScore < oppScore) result = 'L';

      return {
        result,
        score: `${teamScore} - ${oppScore}`,
        opponent: opp || 'Opponent',
        isHome,
        match: m,
      };
    });
  }, [finishedMatches, teamName]);

  // Aggregate top goal scorers for this team from match timeline events
  const topScorers = useMemo(() => {
    const scorerMap = new Map();

    teamMatches.forEach((m) => {
      const isHome = m.homeTeam?.name === teamName;
      const targetTeamId = isHome ? m.homeTeamId : m.awayTeamId;

      (m.details || []).forEach((d) => {
        if (!d.scoringPlay || d.ownGoal) return;
        const eventTeamId = d.team?.id;
        if (eventTeamId && targetTeamId && String(eventTeamId) !== String(targetTeamId)) {
          return;
        }

        const athlete = d.athletesInvolved?.[0];
        if (!athlete) return;
        const id = athlete.id || athlete.displayName || athlete.shortName;
        if (!id) return;

        if (!scorerMap.has(id)) {
          scorerMap.set(id, {
            id: athlete.id,
            name: athlete.displayName || athlete.shortName || 'Unknown Player',
            goals: 0,
          });
        }
        scorerMap.get(id).goals += 1;
      });
    });

    return Array.from(scorerMap.values()).sort((a, b) => b.goals - a.goals);
  }, [teamMatches, teamName]);

  if (!teamName || teamName === 'all') return null;

  return (
    <div 
      className="team-side-panel"
      role="region" 
      aria-label={`${teamName} Team Hub`}
    >
      {/* Panel Header */}
        <div className="team-panel-header">
          <div className="team-panel-brand">
            <div className="team-panel-crest-wrapper">
              <TeamLogo logo={teamLogo} name={teamName} size={48} />
            </div>
            <div className="team-panel-title-info">
              <h2 className="team-panel-name">{teamName}</h2>
              <div className="team-panel-meta">
                <span className="team-panel-league">{teamLeague}</span>
                {stats.rank && (
                  <span 
                    className="team-panel-rank-tag"
                    style={stats.note?.color ? { borderColor: stats.note.color, color: stats.note.color } : undefined}
                  >
                    #{stats.rank} Table
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            className="team-panel-close-btn"
            onClick={onClose}
            aria-label="Close team panel"
            title="Close team view"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Panel Content */}
        <div className="team-panel-body">
          {/* Active Live Fixture Alert if any */}
          {liveMatches.length > 0 && (
            <div className="team-live-alert" onClick={() => onMatchClick?.(liveMatches[0])}>
              <div className="team-live-indicator">
                <span className="live-pulse-dot"></span>
                <strong>LIVE MATCH NOW</strong>
              </div>
              <div className="team-live-score">
                <span>{liveMatches[0].homeTeam?.name}</span>
                <span className="score-pill">
                  {liveMatches[0].score?.home ?? '0'} : {liveMatches[0].score?.away ?? '0'}
                </span>
                <span>{liveMatches[0].awayTeam?.name}</span>
              </div>
              <span className="team-live-sub">Tap to view live stadium radar &gt;</span>
            </div>
          )}

          {/* Record & Performance Summary */}
          <section className="team-section">
            <div className="team-section-header">
              <div className="team-section-title">
                <Trophy size={16} color="var(--accent-primary)" />
                <span>Season Record</span>
              </div>
              {stats.points != null && (
                <span className="team-pts-badge">{stats.points} PTS</span>
              )}
            </div>

            <div className="team-stats-grid">
              <div className="team-stat-box">
                <span className="team-stat-val">{stats.played}</span>
                <span className="team-stat-lbl">Played</span>
              </div>
              <div className="team-stat-box stat-win">
                <span className="team-stat-val">{stats.wins}</span>
                <span className="team-stat-lbl">Won</span>
              </div>
              <div className="team-stat-box stat-draw">
                <span className="team-stat-val">{stats.draws}</span>
                <span className="team-stat-lbl">Drawn</span>
              </div>
              <div className="team-stat-box stat-loss">
                <span className="team-stat-val">{stats.losses}</span>
                <span className="team-stat-lbl">Lost</span>
              </div>
            </div>

            <div className="team-secondary-stats">
              <div className="secondary-stat-item">
                <span>Goals: </span>
                <strong>{stats.goalsFor} scored / {stats.goalsAgainst} conceded</strong>
              </div>
              <div className="secondary-stat-item">
                <span>Goal Diff: </span>
                <strong style={{ color: stats.gd >= 0 ? 'var(--accent-primary)' : 'var(--accent-danger)' }}>
                  {stats.gd > 0 ? `+${stats.gd}` : stats.gd}
                </strong>
              </div>
              <div className="secondary-stat-item">
                <span>Win Rate: </span>
                <strong>{stats.winRate}%</strong>
              </div>
            </div>

            {/* Form Guide */}
            {formGuide.length > 0 && (
              <div className="team-form-container">
                <span className="form-label">Recent Form (Last {formGuide.length}):</span>
                <div className="form-pills-row">
                  {formGuide.map((f, idx) => (
                    <div
                      key={idx}
                      className={`form-badge form-${f.result.toLowerCase()}`}
                      title={`${f.result === 'W' ? 'Won' : f.result === 'D' ? 'Drew' : 'Lost'} ${f.score} vs ${f.opponent}`}
                      onClick={() => onMatchClick?.(f.match)}
                    >
                      {f.result}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Highest Goal Scorers */}
          <section className="team-section">
            <div className="team-section-header">
              <div className="team-section-title">
                <Target size={16} color="var(--accent-gold)" />
                <span>Top Goal Scorers</span>
              </div>
              <span className="team-count-tag">{topScorers.length} Listed</span>
            </div>

            {topScorers.length > 0 ? (
              <div className="team-scorers-list">
                {topScorers.slice(0, 5).map((player, idx) => {
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
                  return (
                    <div
                      key={player.id || idx}
                      className="team-scorer-row"
                      role="button"
                      tabIndex={0}
                      onClick={() => onPlayerClick?.(player.id, teamId, teamLeagueSlug)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onPlayerClick?.(player.id, teamId, teamLeagueSlug);
                        }
                      }}
                      title="View scouting profile"
                    >
                      <div className="scorer-left">
                        <span className="scorer-medal">{medal}</span>
                        <div className="scorer-avatar">
                          <User size={14} />
                        </div>
                        <span className="scorer-name">{player.name}</span>
                      </div>
                      <div className="scorer-right">
                        <span className="scorer-goals">⚽ {player.goals} {player.goals === 1 ? 'Goal' : 'Goals'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="team-empty-state">
                <Flame size={20} color="var(--text-muted)" />
                <p>Scorer statistics update as match timeline events are recorded for this squad.</p>
              </div>
            )}
          </section>

          {/* Upcoming Matches */}
          <section className="team-section">
            <div className="team-section-header">
              <div className="team-section-title">
                <Calendar size={16} color="var(--accent-secondary, #00f2fe)" />
                <span>Upcoming Matches</span>
              </div>
              <span className="team-count-tag">{upcomingMatches.length} Fixtures</span>
            </div>

            {upcomingMatches.length > 0 ? (
              <div className="team-match-cards-list">
                {upcomingMatches.slice(0, 5).map((m) => {
                  const isHome = m.homeTeam?.name === teamName;
                  const oppTeam = isHome ? m.awayTeam : m.homeTeam;
                  const kickoffDisplay = m.kickoff ? formatKickoff(m.kickoff) : m.time || 'Scheduled';

                  return (
                    <div
                      key={m.id}
                      className="team-compact-match-card upcoming"
                      role="button"
                      tabIndex={0}
                      onClick={() => onMatchClick?.(m)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onMatchClick?.(m);
                        }
                      }}
                    >
                      <div className="match-card-top-row">
                        <span className="match-venue-pill">{isHome ? 'HOME' : 'AWAY'}</span>
                        <span className="match-date-str">{kickoffDisplay}</span>
                      </div>
                      <div className="match-opp-row">
                        <div className="match-opp-info">
                          <div className="match-opp-crest">
                            <TeamLogo logo={oppTeam?.logoUrl || oppTeam?.logo} name={oppTeam?.name} size={22} />
                          </div>
                          <span className="match-opp-name">vs {oppTeam?.name}</span>
                        </div>
                        <span className="view-detail-hint">HUB &gt;</span>
                      </div>
                    </div>
                  );
                })}
                {upcomingMatches.length > 5 && (
                  <p className="more-matches-note">+ {upcomingMatches.length - 5} more upcoming matches scheduled</p>
                )}
              </div>
            ) : (
              <div className="team-empty-state">
                <Calendar size={20} color="var(--text-muted)" />
                <p>No upcoming matches scheduled for this competition date.</p>
              </div>
            )}
          </section>

          {/* Recent Match Results */}
          <section className="team-section">
            <div className="team-section-header">
              <div className="team-section-title">
                <History size={16} color="var(--accent-primary)" />
                <span>Recent Results</span>
              </div>
              <span className="team-count-tag">{finishedMatches.length} Matches</span>
            </div>

            {finishedMatches.length > 0 ? (
              <div className="team-match-cards-list">
                {finishedMatches.slice(0, 6).map((m) => {
                  const isHome = m.homeTeam?.name === teamName;
                  const oppTeam = isHome ? m.awayTeam : m.homeTeam;
                  const homeScore = parseInt(m.score?.home ?? '0', 10);
                  const awayScore = parseInt(m.score?.away ?? '0', 10);
                  const teamScore = isHome ? homeScore : awayScore;
                  const oppScore = isHome ? awayScore : homeScore;

                  let res = 'D';
                  let resClass = 'result-draw';
                  if (teamScore > oppScore) {
                    res = 'W';
                    resClass = 'result-win';
                  } else if (teamScore < oppScore) {
                    res = 'L';
                    resClass = 'result-loss';
                  }

                  return (
                    <div
                      key={m.id}
                      className="team-compact-match-card finished"
                      role="button"
                      tabIndex={0}
                      onClick={() => onMatchClick?.(m)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onMatchClick?.(m);
                        }
                      }}
                    >
                      <div className="match-card-top-row">
                        <span className={`result-tag ${resClass}`}>{res}</span>
                        <span className="match-date-str">
                          {m.statusDetail && m.statusDetail !== 'FT' ? m.statusDetail : 'FT'} • {m.kickoff ? new Date(m.kickoff).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
                      <div className="match-opp-row">
                        <div className="match-opp-info">
                          <div className="match-opp-crest">
                            <TeamLogo logo={oppTeam?.logoUrl || oppTeam?.logo} name={oppTeam?.name} size={22} />
                          </div>
                          <span className="match-opp-name">
                            {isHome ? `${teamName} vs ${oppTeam?.name}` : `${oppTeam?.name} vs ${teamName}`}
                          </span>
                        </div>
                        <div className="match-score-bubble">
                          {m.score?.home ?? '0'} - {m.score?.away ?? '0'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="team-empty-state">
                <History size={20} color="var(--text-muted)" />
                <p>No completed matches on record for this view.</p>
              </div>
            )}
          </section>
        </div>
    </div>
  );
}
