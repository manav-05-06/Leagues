import { useState, useMemo } from 'react';
import { getFormationCoordinates } from './formations';

export default function LineupPitch({
  rosters = [],
  match = {},
  shots = [],
  events = [],
  colors = { home: '#00ff87', away: '#00f2fe', draw: '#64748b' },
  onPlayerClick,
}) {
  const [selectedTeamIdx, setSelectedTeamIdx] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const currentRoster =
    rosters?.[selectedTeamIdx] || rosters?.[0] || { starters: [], bench: [], formation: '4-3-3' };
  const isHome = selectedTeamIdx === 0;
  const teamColor = isHome ? colors.home : colors.away;
  const leagueSlug = match?.leagueSlug || match?.league || 'eng.1';

  // Compute tactical coordinates for the 11 starters
  const positionedStarters = useMemo(() => {
    if (!currentRoster.starters || currentRoster.starters.length === 0) return [];
    return getFormationCoordinates(currentRoster.formation, currentRoster.starters);
  }, [currentRoster.formation, currentRoster.starters]);

  // Selected player's actions (shots and events)
  const playerActions = useMemo(() => {
    if (!selectedPlayer) return { shots: [], events: [] };
    const pShots = shots.filter(
      (s) =>
        s.player_id === selectedPlayer.id ||
        (selectedPlayer.name && s.player_name?.toLowerCase().includes(selectedPlayer.name?.toLowerCase()))
    );
    const pEvents = events.filter(
      (e) =>
        e.player_id === selectedPlayer.id ||
        (selectedPlayer.name && e.player_name?.toLowerCase().includes(selectedPlayer.name?.toLowerCase()))
    );
    return { shots: pShots, events: pEvents };
  }, [selectedPlayer, shots, events]);

  if (!rosters || rosters.length === 0) return null;

  return (
    <div className="analytics-card">
      <div className="analytics-card-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 className="analytics-card-title">Tactical Lineups</h3>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Tap a player to highlight their role and actions
          </p>
        </div>

        {/* Team Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--glass-border-subtle, rgba(255, 255, 255, 0.08))',
          }}
        >
          {rosters.map((r, idx) => (
            <button
              key={r.team_id || idx}
              type="button"
              onClick={() => {
                setSelectedTeamIdx(idx);
                setSelectedPlayer(null);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: selectedTeamIdx === idx ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: selectedTeamIdx === idx ? 'var(--text-main, #ffffff)' : 'var(--text-muted, #94a3b8)',
                transition: 'all 0.15s ease',
              }}
            >
              {r.team_name} ({r.formation})
            </button>
          ))}
        </div>
      </div>

      {/* Vertical Tactical Pitch Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          margin: '0 auto',
          aspectRatio: '100 / 120',
          borderRadius: '12px',
          border: '1px solid var(--glass-border-subtle, rgba(255, 255, 255, 0.08))',
          background: 'rgba(10, 28, 19, 0.85)',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        <svg
          viewBox="0 0 100 120"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            color: 'rgba(255, 255, 255, 0.2)',
          }}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.6"
        >
          {/* Grass bands */}
          <defs>
            <pattern id="tactical-stripes" width="100" height="24" patternUnits="userSpaceOnUse">
              <rect width="100" height="12" fill="rgba(255, 255, 255, 0.015)" />
              <rect y="12" width="100" height="12" fill="transparent" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="100" height="120" fill="url(#tactical-stripes)" stroke="none" />

          {/* Outer Boundary */}
          <rect x="2" y="2" width="96" height="116" rx="2" strokeWidth="0.8" />

          {/* Halfway Line & Center Circle */}
          <line x1="2" y1="60" x2="98" y2="60" strokeWidth="0.6" />
          <circle cx="50" cy="60" r="14" strokeWidth="0.6" />
          <circle cx="50" cy="60" r="1" fill="currentColor" />

          {/* Own Penalty Box (Bottom / Defending Goal) */}
          <rect x="22" y="94" width="56" height="24" strokeWidth="0.6" />
          <rect x="36" y="106" width="28" height="12" strokeWidth="0.6" />
          <circle cx="50" cy="103" r="1" fill="currentColor" />
          <path d="M 38 94 A 12 12 0 0 1 62 94" strokeWidth="0.6" />

          {/* Opponent Penalty Box (Top / Attacking Goal) */}
          <rect x="22" y="2" width="56" height="24" strokeWidth="0.6" />
          <rect x="36" y="2" width="28" height="12" strokeWidth="0.6" />
          <circle cx="50" cy="17" r="1" fill="currentColor" />
          <path d="M 38 26 A 12 12 0 0 0 62 26" strokeWidth="0.6" />

          {/* If a player is selected, show their action overlay */}
          {selectedPlayer && (
            <g>
              {playerActions.shots.map((s) => (
                <circle
                  key={`shot-${s.id}`}
                  cx={s.y}
                  cy={100 - s.x}
                  r={3}
                  fill={s.outcome === 'goal' ? '#fbbf24' : '#38bdf8'}
                  stroke="#ffffff"
                  strokeWidth={0.8}
                />
              ))}
            </g>
          )}

          {/* Render 11 Starter Nodes */}
          {positionedStarters.map((player) => {
            const isSelected = selectedPlayer?.id === player.id;
            const surname = player.name.split(' ').pop();

            return (
              <g
                key={player.id}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedPlayer(isSelected ? null : player)}
                tabIndex={0}
                role="button"
                aria-label={`${player.name}, #${player.jersey}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedPlayer(isSelected ? null : player);
                  }
                }}
              >
                {/* Active Player Halo */}
                {isSelected && (
                  <circle
                    cx={player.x}
                    cy={player.y}
                    r={6.8}
                    fill="none"
                    stroke="var(--accent-primary, #00ff87)"
                    strokeWidth={1.2}
                  />
                )}

                {/* Jersey Badge */}
                <circle
                  cx={player.x}
                  cy={player.y}
                  r={4.8}
                  fill={isSelected ? 'var(--accent-primary, #00ff87)' : '#0f172a'}
                  stroke={isSelected ? '#ffffff' : teamColor}
                  strokeWidth={1.2}
                />

                {/* Shirt Number */}
                <text
                  x={player.x}
                  y={player.y + 1.4}
                  textAnchor="middle"
                  fontSize="4.2"
                  fontWeight="bold"
                  fill={isSelected ? '#08170f' : '#ffffff'}
                  fontFamily="monospace"
                >
                  {player.jersey || player.formation_place || '•'}
                </text>

                {/* Player Surname Label */}
                <text
                  x={player.x}
                  y={player.y + 7.0}
                  textAnchor="middle"
                  fontSize="2.8"
                  fontWeight="600"
                  fill={isSelected ? 'var(--accent-primary, #00ff87)' : '#e2e8f0'}
                  stroke="#000000"
                  strokeWidth="0.3"
                  paintOrder="stroke"
                >
                  {surname}
                </text>

                {/* Status Badges: Goal, Card, Sub */}
                {player.goals > 0 && (
                  <text x={player.x + 3.8} y={player.y - 2.5} fontSize="3.5">
                    ⚽
                  </text>
                )}
                {player.yellow_cards > 0 && (
                  <rect
                    x={player.x - 5.5}
                    y={player.y - 4.5}
                    width="2.2"
                    height="3.2"
                    rx="0.4"
                    fill="#facc15"
                  />
                )}
                {player.red_cards > 0 && (
                  <rect
                    x={player.x - 5.5}
                    y={player.y - 4.5}
                    width="2.2"
                    height="3.2"
                    rx="0.4"
                    fill="#ef4444"
                  />
                )}
                {player.subbed_out && (
                  <text x={player.x - 5.5} y={player.y + 4.5} fontSize="3.0" fill="#ef4444">
                    ↓
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Selected Player Tactical Drawer / Overlay */}
        {selectedPlayer && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              right: '12px',
              borderRadius: '10px',
              border: '1px solid var(--glass-border-subtle, rgba(255, 255, 255, 0.12))',
              background: 'rgba(15, 23, 42, 0.95)',
              padding: '12px',
              fontSize: '12px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: '8px',
                marginBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: teamColor,
                  }}
                >
                  #{selectedPlayer.jersey}
                </span>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#f8fafc' }}>
                    {selectedPlayer.name}
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {selectedPlayer.position} · Role: {selectedPlayer.tacticalRole}
                  </span>
                </div>
              </div>

              {onPlayerClick && (
                <button
                  type="button"
                  onClick={() =>
                    onPlayerClick(
                      selectedPlayer.id,
                      currentRoster.team_id,
                      leagueSlug
                    )
                  }
                  style={{
                    borderRadius: '6px',
                    background: 'rgba(0, 255, 135, 0.12)',
                    border: '1px solid rgba(0, 255, 135, 0.3)',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--accent-primary, #00ff87)',
                    cursor: 'pointer',
                  }}
                >
                  Scout Profile →
                </button>
              )}
            </div>

            {/* Quick Metrics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '6px',
                textAlign: 'center',
                fontSize: '11px',
              }}
            >
              <div
                style={{
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  xG
                </span>
                <span style={{ fontWeight: 700, color: 'var(--accent-primary, #00ff87)', fontFamily: 'monospace' }}>
                  {selectedPlayer.xg?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div
                style={{
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Shots
                </span>
                <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                  {selectedPlayer.shots || 0}
                </span>
              </div>
              <div
                style={{
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Goals
                </span>
                <span style={{ fontWeight: 700, color: '#fbbf24' }}>
                  {selectedPlayer.goals || 0}
                </span>
              </div>
              <div
                style={{
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Fouls
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                  {selectedPlayer.fouls_won || 0}/{selectedPlayer.fouls_committed || 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bench / Substitutes List */}
      {currentRoster.bench && currentRoster.bench.length > 0 && (
        <div style={{ marginTop: '12px', borderTop: '1px solid var(--glass-border-subtle, rgba(255, 255, 255, 0.08))', paddingTop: '12px' }}>
          <span
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-muted)',
              marginBottom: '8px',
            }}
          >
            Bench & Substitutes
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {currentRoster.bench.map((b) => (
              <span
                key={b.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid var(--glass-border-subtle, rgba(255, 255, 255, 0.06))',
                  fontSize: '12px',
                  color: 'var(--text-main)',
                  cursor: onPlayerClick ? 'pointer' : 'default',
                }}
                onClick={() =>
                  onPlayerClick && onPlayerClick(b.id, currentRoster.team_id, leagueSlug)
                }
              >
                <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '10px' }}>
                  #{b.jersey}
                </span>
                <span>{b.name}</span>
                {b.subbed_in && (
                  <span style={{ color: 'var(--accent-primary, #00ff87)', fontSize: '10px' }}>↑ In</span>
                )}
                {b.yellow_cards > 0 && <span style={{ fontSize: '10px' }}>🟨</span>}
                {b.red_cards > 0 && <span style={{ fontSize: '10px' }}>🟥</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
