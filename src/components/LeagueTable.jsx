import React, { useState, useEffect } from 'react';
import { Trophy, Radio, CheckCircle2, Clock, Activity, Crown, Shield, Award, Sparkles, TrendingUp, Filter } from 'lucide-react';
import { useAppStore } from '../store';
import { fetchLeagueStandings } from '../api.jsx';
import { ALL_LEAGUES } from './Header';

export default function LeagueTable({ matches }) {
  const { selectedLeague, selectedSeason, setSelectedLeague } = useAppStore();
  
  // Active league for standings (if 'all' is selected, default to 'eng.1' for standings view)
  const currentLeagueSlug = selectedLeague === 'all' ? 'eng.1' : selectedLeague;
  
  const [standingsData, setStandingsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'distribution'

  useEffect(() => {
    let isMounted = true;
    const loadStandings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchLeagueStandings(currentLeagueSlug, selectedSeason);
        if (isMounted) {
          if (data && data.groups && data.groups.length > 0) {
            setStandingsData(data);
          } else {
            setStandingsData(null);
          }
        }
      } catch (err) {
        if (isMounted) setError("Standings currently unavailable for this competition/season.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadStandings();
    return () => { isMounted = false; };
  }, [currentLeagueSlug, selectedSeason]);

  const activeLeagueInfo = ALL_LEAGUES.find(l => l.id === currentLeagueSlug) || {
    name: standingsData?.leagueName || 'League Table',
    logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/23.png'
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
              OFFICIAL TABLE & RANKINGS &bull; SEASON {selectedSeason}-{parseInt(selectedSeason) + 1}
            </p>
          </div>
        </div>

        {/* View Mode & League Quick Switch */}
        <div className="standings-controls-group">
          <select 
            value={currentLeagueSlug} 
            onChange={(e) => setSelectedLeague(e.target.value)}
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
                  <div className="champion-left">
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
                  </div>

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
                          const isTop4 = entry.rank > 1 && entry.rank <= 4;
                          const isEuropa = entry.rank === 5 || entry.rank === 6;
                          const isRelegation = entry.rank >= group.entries.length - 2 && group.entries.length > 10;

                          let rankBadgeClass = 'rank-standard';
                          if (isLeader) rankBadgeClass = 'rank-gold';
                          else if (isTop4) rankBadgeClass = 'rank-blue';
                          else if (isEuropa) rankBadgeClass = 'rank-orange';
                          else if (isRelegation) rankBadgeClass = 'rank-red';

                          return (
                            <tr key={entry.id || entry.rank} className={`standings-row ${isLeader ? 'leader-row' : ''}`}>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`rank-badge ${rankBadgeClass}`}>
                                  {isLeader ? <Crown size={12} /> : null}
                                  {entry.rank}
                                </span>
                              </td>
                              <td className="team-cell">
                                <div className="team-cell-wrapper">
                                  {entry.team.logo ? (
                                    <img src={entry.team.logo} alt={entry.team.name} className="table-team-logo" />
                                  ) : (
                                    <div className="table-team-placeholder">⚽</div>
                                  )}
                                  <span className="table-team-name">{entry.team.name}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 600 }}>{entry.stats.played}</td>
                              <td style={{ textAlign: 'center', color: '#00ff87' }}>{entry.stats.wins}</td>
                              <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{entry.stats.draws}</td>
                              <td style={{ textAlign: 'center', color: 'var(--accent-danger)' }}>{entry.stats.losses}</td>
                              <td className="hide-mobile" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{entry.stats.goalsFor}</td>
                              <td className="hide-mobile" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{entry.stats.goalsAgainst}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: parseInt(entry.stats.goalDiff) > 0 ? '#00ff87' : parseInt(entry.stats.goalDiff) < 0 ? '#ff3366' : 'var(--text-main)' }}>
                                {parseInt(entry.stats.goalDiff) > 0 ? `+${entry.stats.goalDiff}` : entry.stats.goalDiff}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <strong className="pts-badge">{entry.stats.points}</strong>
                              </td>
                              <td className="hide-mobile">
                                {entry.note ? (
                                  <span className="qualification-note-tag" style={{ borderLeftColor: entry.note.color || 'var(--accent-primary)' }}>
                                    {entry.note.description}
                                  </span>
                                ) : isLeader ? (
                                  <span className="qualification-note-tag leader-tag">
                                    🏆 Champions / Winner
                                  </span>
                                ) : isTop4 ? (
                                  <span className="qualification-note-tag ucl-tag">
                                    ⭐ Champions League
                                  </span>
                                ) : isEuropa ? (
                                  <span className="qualification-note-tag uel-tag">
                                    🔸 Europa League
                                  </span>
                                ) : isRelegation ? (
                                  <span className="qualification-note-tag rel-tag">
                                    🔻 Relegation Zone
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

