import { useState, useMemo } from 'react';
import InfoButton from './InfoButton';

const KEEPER_INFO =
  'Compares goals let in with the quality of the shots on target faced. A positive number means the keeper stopped more than an average keeper would.';

function computeScore(p) {
  const goals = p.goals || 0;
  const assists = p.assists || 0;
  const xg = p.xg || 0;
  const onTarget = p.shots_on_target || 0;
  return 3 * goals + 2 * assists + xg + 0.3 * onTarget;
}

function formatPlayerStat(p) {
  const parts = [];
  if (p.goals > 0) parts.push(`⚽ ${p.goals} ${p.goals === 1 ? 'goal' : 'goals'}`);
  if (p.assists > 0) parts.push(`${p.assists} ${p.assists === 1 ? 'assist' : 'assists'}`);
  if (p.shots > 0 && p.goals === 0) {
    parts.push(`${p.shots} ${p.shots === 1 ? 'shot' : 'shots'}`);
  }
  if (p.xg > 0) parts.push(`${p.xg.toFixed(1)} xG`);

  if (parts.length === 0) {
    if (p.saves > 0) return `${p.saves} saves`;
    return '0 shots';
  }
  return parts.join(' · ');
}

export default function TopPerformers({
  players = [],
  rosters = [],
  match = {},
  colors = { home: '#00ff87', away: '#00f2fe', draw: '#64748b' },
  onPlayerClick,
}) {
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  const home = match?.home || {};
  const away = match?.away || {};
  const leagueSlug = match?.leagueSlug || match?.league || 'eng.1';

  // Compute top 3 performers for each team
  const { homeTop, awayTop } = useMemo(() => {
    const homeList = players.filter((p) => String(p.team_id) === String(home.id));
    const awayList = players.filter((p) => String(p.team_id) === String(away.id));

    const sortFn = (a, b) => {
      const sa = computeScore(a);
      const sb = computeScore(b);
      if (Math.abs(sb - sa) > 0.001) return sb - sa;
      return (b.shots || 0) - (a.shots || 0);
    };

    let hTop = homeList.filter((p) => computeScore(p) > 0).sort(sortFn).slice(0, 3);
    if (hTop.length === 0 && homeList.length > 0) {
      hTop = homeList.slice().sort((a, b) => (b.shots || 0) - (a.shots || 0)).slice(0, 3);
    }

    let aTop = awayList.filter((p) => computeScore(p) > 0).sort(sortFn).slice(0, 3);
    if (aTop.length === 0 && awayList.length > 0) {
      aTop = awayList.slice().sort((a, b) => (b.shots || 0) - (a.shots || 0)).slice(0, 3);
    }

    return { homeTop: hTop, awayTop: aTop };
  }, [players, home.id, away.id]);

  // Starting goalkeepers
  const keepers = useMemo(() => {
    const list = [];
    rosters.forEach((r) => {
      const gk = r.starters?.find(
        (p) => p.position_group === 'G' || p.formation_place === 1
      );
      if (gk) {
        list.push({ ...gk, teamName: r.team_name, teamId: r.team_id });
      }
    });

    if (list.length === 0) {
      const gks = players.filter((p) => p.position_group === 'G');
      return gks;
    }
    return list;
  }, [rosters, players]);

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <h3 className="analytics-card-title">Top Performers</h3>
      </div>

      {/* Grid of Top 3 per Team */}
      <div className="top-performers-grid">
        {/* Home Team Top Performers */}
        <div className="top-performer-team-col">
          <div className="top-performer-team-title">
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: colors.home,
                display: 'inline-block',
              }}
            />
            {home.name || 'Home'}
          </div>
          {homeTop.length > 0 ? (
            homeTop.map((player) => (
              <div
                key={player.id}
                className="top-performer-row"
                style={{ cursor: onPlayerClick ? 'pointer' : 'default' }}
                onClick={() =>
                  onPlayerClick && onPlayerClick(player.id, player.team_id, leagueSlug)
                }
                tabIndex={onPlayerClick ? 0 : undefined}
                role={onPlayerClick ? 'button' : undefined}
                onKeyDown={(e) => {
                  if (onPlayerClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onPlayerClick(player.id, player.team_id, leagueSlug);
                  }
                }}
              >
                <div className="top-performer-name">
                  {player.jersey ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'monospace' }}>
                      #{player.jersey}
                    </span>
                  ) : null}
                  <span>{player.name}</span>
                </div>
                <div className="top-performer-stat">{formatPlayerStat(player)}</div>
              </div>
            ))
          ) : (
            <div className="top-performer-row" style={{ color: 'var(--text-muted)' }}>
              No shot data recorded yet
            </div>
          )}
        </div>

        {/* Away Team Top Performers */}
        <div className="top-performer-team-col">
          <div className="top-performer-team-title">
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: colors.away,
                display: 'inline-block',
              }}
            />
            {away.name || 'Away'}
          </div>
          {awayTop.length > 0 ? (
            awayTop.map((player) => (
              <div
                key={player.id}
                className="top-performer-row"
                style={{ cursor: onPlayerClick ? 'pointer' : 'default' }}
                onClick={() =>
                  onPlayerClick && onPlayerClick(player.id, player.team_id, leagueSlug)
                }
                tabIndex={onPlayerClick ? 0 : undefined}
                role={onPlayerClick ? 'button' : undefined}
                onKeyDown={(e) => {
                  if (onPlayerClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onPlayerClick(player.id, player.team_id, leagueSlug);
                  }
                }}
              >
                <div className="top-performer-name">
                  {player.jersey ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'monospace' }}>
                      #{player.jersey}
                    </span>
                  ) : null}
                  <span>{player.name}</span>
                </div>
                <div className="top-performer-stat">{formatPlayerStat(player)}</div>
              </div>
            ))
          ) : (
            <div className="top-performer-row" style={{ color: 'var(--text-muted)' }}>
              No shot data recorded yet
            </div>
          )}
        </div>
      </div>

      {/* Goalkeepers Subsection */}
      {keepers.length > 0 && (
        <div style={{ marginTop: '12px', borderTop: '1px solid var(--glass-border-subtle, rgba(255, 255, 255, 0.08))', paddingTop: '12px' }}>
          <div className="analytics-card-header" style={{ marginBottom: '8px' }}>
            <h4 className="analytics-card-title" style={{ fontSize: '12px' }}>
              Goalkeepers
            </h4>
            <InfoButton text={KEEPER_INFO} />
          </div>

          <div className="keeper-reading-card">
            {keepers.map((k) => {
              const gp = k.goals_prevented != null ? Number(k.goals_prevented) : 0;
              const isHomeK = String(k.teamId || k.team_id) === String(home.id);
              const teamColor = isHomeK ? colors.home : colors.away;
              const diffText =
                gp >= 0
                  ? `saved ${Math.abs(gp).toFixed(1)} goals more than expected`
                  : `saved ${Math.abs(gp).toFixed(1)} goals fewer than expected`;

              return (
                <div
                  key={k.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid var(--glass-border-subtle, rgba(255, 255, 255, 0.06))',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: teamColor,
                        display: 'inline-block',
                      }}
                    />
                    <strong style={{ color: 'var(--text-main)' }}>{k.name}</strong>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {k.saves || 0} {k.saves === 1 ? 'save' : 'saves'} · {diffText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Show All Players Toggle */}
      <div style={{ marginTop: '4px' }}>
        <button
          type="button"
          onClick={() => setShowAllPlayers((prev) => !prev)}
          className="chances-expand-btn"
          aria-expanded={showAllPlayers}
        >
          {showAllPlayers ? 'Hide players ▴' : 'Show all players ▾'}
        </button>

        {showAllPlayers && (
          <div className="all-players-table-wrap">
            <table className="all-players-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Team</th>
                  <th className="num-col">Shots</th>
                  <th className="num-col">Goals</th>
                  <th className="num-col">Assists</th>
                  <th className="num-col">Cards</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const isHomeP = String(p.team_id) === String(home.id);
                  const teamColor = isHomeP ? colors.home : colors.away;
                  const teamName = isHomeP ? (home.name || 'Home') : (away.name || 'Away');
                  const cards = [];
                  if (p.yellow_cards > 0) cards.push(`🟨 ${p.yellow_cards > 1 ? p.yellow_cards : ''}`);
                  if (p.red_cards > 0) cards.push('🟥');

                  return (
                    <tr
                      key={p.id}
                      style={{ cursor: onPlayerClick ? 'pointer' : 'default' }}
                      onClick={() =>
                        onPlayerClick && onPlayerClick(p.id, p.team_id, leagueSlug)
                      }
                    >
                      <td>
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                        {p.jersey ? (
                          <span style={{ color: 'var(--text-muted)', marginLeft: '4px', fontSize: '11px' }}>
                            #{p.jersey}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: teamColor,
                              display: 'inline-block',
                            }}
                          />
                          {teamName}
                        </span>
                      </td>
                      <td className="num-col">{p.shots || 0}</td>
                      <td className="num-col">{p.goals || 0}</td>
                      <td className="num-col">{p.assists || 0}</td>
                      <td className="num-col">{cards.join(' ') || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
