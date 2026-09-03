import React from 'react';
import { Trophy, Radio, CheckCircle2, Clock, Activity } from 'lucide-react';

const LEAGUE_ICONS = {
  'English Premier League': 'https://a.espncdn.com/i/leaguelogos/soccer/500/23.png',
  'Premier League': 'https://a.espncdn.com/i/leaguelogos/soccer/500/23.png',
  'Spanish LALIGA': 'https://a.espncdn.com/i/leaguelogos/soccer/500/15.png',
  'LaLiga': 'https://a.espncdn.com/i/leaguelogos/soccer/500/15.png',
  'German Bundesliga': 'https://a.espncdn.com/i/leaguelogos/soccer/500/10.png',
  'Bundesliga': 'https://a.espncdn.com/i/leaguelogos/soccer/500/10.png'
};

export default function LeagueTable({ matches }) {
  // Aggregate stats per league
  const leagueStats = {};
  matches.forEach((m) => {
    const name = m.league || 'Unknown League';
    if (!leagueStats[name]) {
      leagueStats[name] = { total: 0, live: 0, finished: 0, upcoming: 0 };
    }
    leagueStats[name].total += 1;
    if (m.status === 'live') leagueStats[name].live += 1;
    else if (m.status === 'finished') leagueStats[name].finished += 1;
    else leagueStats[name].upcoming += 1;
  });

  const rows = Object.entries(leagueStats).map(([league, stats], idx) => {
    const iconUrl = Object.entries(LEAGUE_ICONS).find(([k]) => league.toLowerCase().includes(k.toLowerCase()))?.[1];

    return (
      <tr key={league}>
        <td style={{ width: '40px', fontWeight: 700, color: 'var(--accent-primary)' }}>
          #{idx + 1}
        </td>
        <td className="league-name">
          {iconUrl ? (
            <img src={iconUrl} alt={league} style={{ width: 26, height: 26, objectFit: 'contain' }} />
          ) : (
            <Trophy size={20} color="var(--accent-gold)" />
          )}
          <span>{league}</span>
        </td>
        <td style={{ fontWeight: 700 }}>{stats.total}</td>
        <td className="stat-pill-live">
          {stats.live > 0 ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255, 51, 102, 0.15)', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255, 51, 102, 0.3)' }}>
              <Radio size={12} className="pulse-dot" /> {stats.live} LIVE
            </span>
          ) : (
            '0'
          )}
        </td>
        <td className="stat-pill-finished">{stats.finished}</td>
        <td style={{ color: 'var(--accent-secondary)' }}>{stats.upcoming}</td>
        <td>
          <div style={{ display: 'flex', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stats.live > 0 ? 'var(--accent-danger)' : 'var(--accent-primary)' }}></span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)' }}></span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-secondary)' }}></span>
          </div>
        </td>
      </tr>
    );
  });

  return (
    <div className="league-table-wrapper">
      <div className="table-header-title">
        <h3>
          <Activity size={22} color="var(--accent-primary)" />
          European League Standings & Match Distribution
        </h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-scoreboard)' }}>
          OFFICIAL MATCH STATS
        </span>
      </div>
      <table className="league-table">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Competition</th>
            <th>Total Fixtures</th>
            <th>Live Now</th>
            <th>Completed</th>
            <th>Upcoming</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No active league data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

