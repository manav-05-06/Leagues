import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Radio, Activity, Crown, Shield, Award } from 'lucide-react';
import { useAppStore } from '../store';
import { useStandings } from '../hooks/useMatches';
import { ALL_LEAGUES } from '../constants/leagues';
import { paths } from '../routes.js';

export default function LeagueTable({ matches = [] }) {
  const navigate = useNavigate();
  const selectedLeague = useAppStore((state) => state.selectedLeague);
  const selectedSeason = useAppStore((state) => state.selectedSeason);
  
  // Active league for standings (if 'all' is selected, default to 'eng.1' for standings view)
  const currentLeagueSlug = selectedLeague === 'all' ? 'eng.1' : selectedLeague;
  
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'distribution'

  const { data: standingsData, isLoading: loading, error: queryError } = useStandings(currentLeagueSlug, selectedSeason);
  const error = queryError ? 'Standings currently unavailable for this competition/season.' : null;

  const activeLeagueInfo = ALL_LEAGUES.find(l => l.id === currentLeagueSlug) || {
    name: standingsData?.leagueName || 'League Table',
    logo: null
  };

  // Find leader / champion across first group
  const leaderEntry = standingsData?.groups?.[0]?.entries?.[0];

  // Aggregate stats per league for match distribution view
  const leagueStats = {};
  matches.forEach((m) => {
    const name = m.league || 'Unknown League';
    if (!leagueStats[name]) {
      leagueStats[name] = { total: 0, live: 0, finished: 0, upcoming: 0, logo: m.leagueLogo };
    }
    leagueStats[name].total += 1;
    if (m.status === 'live') leagueStats[name].live += 1;
    else if (m.status === 'finished') leagueStats[name].finished += 1;
    else leagueStats[name].upcoming += 1;
  });

  return (
    <div className="league-standings-container">
      {/* Top Standings Header & League Switcher */}
      <div className="standings-header-bar">
        <div className="standings-title-group">
          <div className="standings-league-crest">
            {activeLeagueInfo.logo ? (
              <img src={activeLeagueInfo.logo} alt={activeLeagueInfo.name} />
            ) : (
              <Trophy size={28} color="var(--accent-gold)" />
            )}
          </div>
          <div>
            <h2>{standingsData?.leagueName || activeLeagueInfo.name}</h2>
            <p className="standings-subtitle">
              OFFICIAL TABLE & RANKINGS &bull; SEASON {selectedSeason}-{parseInt(selectedSeason, 10) + 1}
            </p>
          </div>
        </div>

        {/* View Mode & League Quick Switch */}
        <div className="standings-controls-group">
          <select 
            value={currentLeagueSlug} 
            onChange={(e) => {
              navigate(paths.table(e.target.value));
            }}
            className="season-select-styled"
            style={{ minWidth: '180px' }}
          >
            {ALL_LEAGUES.filter(l => l.id !== 'all').map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

          <div className="view-toggle-pills">
            <button 
              className={`view-pill-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <Award size={15} /> Official Table
            </button>
            <button 
              className={`view-pill-btn ${viewMode === 'distribution' ? 'active' : ''}`}
              onClick={() => setViewMode('distribution')}
            >
              <Activity size={15} /> Match Stats
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <>
          {loading ? (
            <div className="modal-loading" style={{ minHeight: '300px' }}>
              <div className="pitch-loading-spinner">⚽</div>
              <p>Fetching Official Table Standings & Team Rankings...</p>
            </div>
          ) : error || !standingsData || standingsData.groups.length === 0 ? (
            <div className="no-live-matches" style={{ margin: '3rem 0', textAlign: 'center' }}>
              {error || "Official table rankings not published yet for this tournament/season."}
            </div>
          ) : (
            <>
              {/* Champion / Leader Spotlight Banner */}
              {leaderEntry && (
                <div className="champion-spotlight-banner">
                  <div className="champion-glow-bg"></div>
                  <Link 
                    to={paths.team({ id: leaderEntry.team.id, name: leaderEntry.team.name })}
                    className="champion-left"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="crown-badge">
                      <Crown size={24} color="#ffd700" />
                      <span>#1 RANKED</span>
                    </div>
                    <div className="champion-team-crest">
                      {leaderEntry.team.logo ? (
                        <img src={leaderEntry.team.logo} alt={leaderEntry.team.name} />
                      ) : (
                        <span>⚽</span>
                      )}
                    </div>
                    <div className="champion-team-details">
                      <span className="champion-tag">TABLE LEADER &bull; WINNER SPOTLIGHT</span>
                      <h3>{leaderEntry.team.name}</h3>
                      <p className="champion-record">
                        Record: <strong>{leaderEntry.stats.wins}W</strong> - {leaderEntry.stats.draws}D - {leaderEntry.stats.losses}L
                      </p>
                    </div>
                  </Link>

                  <div className="champion-stats-grid">
                    <div className="champ-stat-box">
                      <span className="champ-stat-label">POINTS</span>
                      <span className="champ-stat-val points-highlight">{leaderEntry.stats.points}</span>
                    </div>
                    <div className="champ-stat-box">
                      <span className="champ-stat-label">GOAL DIFF</span>
                      <span className="champ-stat-val">{leaderEntry.stats.goalDiff}</span>
                    </div>
                    <div className="champ-stat-box">
                      <span className="champ-stat-label">MATCHES</span>
                      <span className="champ-stat-val">{leaderEntry.stats.played}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Standings Tables (supports single table or tournament groups) */}
              {standingsData.groups.map((group, grpIdx) => (
                <div key={group.groupName || grpIdx} className="standings-table-card">
                  {standingsData.groups.length > 1 && (
                    <div className="group-title-header">
                      <Shield size={18} color="var(--accent-primary)" />
                      <span>{group.groupName}</span>
                    </div>
                  )}

                  <div className="table-responsive-wrapper">
                    <table className="official-standings-table">
                      <thead>
                        <tr>
                          <th style={{ width: '50px', textAlign: 'center' }}>Pos</th>
                          <th>Club</th>
                          <th title="Matches Played" style={{ textAlign: 'center' }}>MP</th>
                          <th title="Wins" style={{ textAlign: 'center' }}>W</th>
                          <th title="Draws" style={{ textAlign: 'center' }}>D</th>
                          <th title="Losses" style={{ textAlign: 'center' }}>L</th>
                          <th title="Goals For" className="hide-mobile" style={{ textAlign: 'center' }}>GF</th>
                          <th title="Goals Against" className="hide-mobile" style={{ textAlign: 'center' }}>GA</th>
                          <th title="Goal Difference" style={{ textAlign: 'center' }}>GD</th>
                          <th title="Points" style={{ textAlign: 'center' }}>PTS</th>
                          <th className="hide-mobile">Qualification / Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.entries.map((entry) => {
                          const isLeader = entry.rank === 1;
                          const noteColor = entry.note?.color;

                          return (
                            <tr key={entry.id || entry.rank} className={`standings-row ${isLeader ? 'leader-row' : ''}`}>
                              <td style={{ textAlign: 'center' }}>
                                <span 
                                  className="rank-badge rank-standard"
                                  style={noteColor ? { borderColor: noteColor, color: noteColor } : undefined}
                                >
                                  {isLeader && !noteColor ? <Crown size={12} /> : null}
                                  {entry.rank}
                                </span>
                              </td>
                              <td className="team-cell">
                                <Link 
                                  to={paths.team({ id: entry.team.id, name: entry.team.name })}
                                  className="team-cell-wrapper"
                                  style={{ textDecoration: 'none', color: 'inherit' }}
                                  title={`View ${entry.team.name} Team Page`}
                                >
                                  {entry.team.logo ? (
                                    <img src={entry.team.logo} alt={entry.team.name} className="table-team-logo" />
                                  ) : (
                                    <div className="table-team-placeholder">⚽</div>
                                  )}
                                  <span className="table-team-name">{entry.team.name}</span>
                                </Link>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 600 }}>{entry.stats.played}</td>
                              <td style={{ textAlign: 'center', color: '#00ff87' }}>{entry.stats.wins}</td>
                              <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{entry.stats.draws}</td>
                              <td style={{ textAlign: 'center', color: 'var(--accent-danger)' }}>{entry.stats.losses}</td>
                              <td className="hide-mobile" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{entry.stats.goalsFor}</td>
                              <td className="hide-mobile" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{entry.stats.goalsAgainst}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: parseInt(entry.stats.goalDiff, 10) > 0 ? '#00ff87' : parseInt(entry.stats.goalDiff, 10) < 0 ? '#ff3366' : 'var(--text-main)' }}>
                                {parseInt(entry.stats.goalDiff, 10) > 0 ? `+${entry.stats.goalDiff}` : entry.stats.goalDiff}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <strong className="pts-badge">{entry.stats.points}</strong>
                              </td>
                              <td className="hide-mobile">
                                {entry.note ? (
                                  <span className="qualification-note-tag" style={{ borderLeftColor: noteColor || 'var(--accent-primary)' }}>
                                    {entry.note.description}
                                  </span>
                                ) : (
                                  <span className="table-midtable-dash">&mdash;</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      ) : (
        /* Match Overview / Distribution View */
        <div className="standings-table-card">
          <div className="table-responsive-wrapper">
            <table className="official-standings-table">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                  <th>Competition</th>
                  <th style={{ textAlign: 'center' }}>Total Fixtures</th>
                  <th style={{ textAlign: 'center' }}>Live Matches</th>
                  <th style={{ textAlign: 'center' }}>Completed</th>
                  <th style={{ textAlign: 'center' }}>Upcoming</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(leagueStats).map(([leagueName, stats], idx) => (
                  <tr key={leagueName}>
                    <td style={{ textAlign: 'center', color: 'var(--accent-primary)', fontWeight: 700 }}>
                      #{idx + 1}
                    </td>
                    <td className="team-cell">
                      <div className="team-cell-wrapper">
                        {stats.logo ? (
                          <img src={stats.logo} alt={leagueName} className="table-team-logo" />
                        ) : (
                          <Trophy size={18} color="var(--accent-gold)" />
                        )}
                        <span className="table-team-name">{leagueName}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{stats.total}</td>
                    <td style={{ textAlign: 'center' }}>
                      {stats.live > 0 ? (
                        <span className="stat-pill-live">
                          <Radio size={12} className="pulse-dot" /> {stats.live} LIVE
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td style={{ textAlign: 'center', color: '#00ff87', fontWeight: 600 }}>{stats.finished}</td>
                    <td style={{ textAlign: 'center', color: 'var(--accent-secondary)' }}>{stats.upcoming}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
