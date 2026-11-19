import { useState, useMemo } from 'react';
import { getFormationCoordinates } from './formations';

export default function LineupPitch({ rosters = [], match, shots = [], events = [], onPlayerClick }) {
  const [selectedTeamIdx, setSelectedTeamIdx] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const currentRoster = rosters?.[selectedTeamIdx] || rosters?.[0] || { starters: [], bench: [], formation: '4-3-3' };
  const isHome = selectedTeamIdx === 0;
  const teamColor = isHome
    ? (match?.home?.color || '#38bdf8')
    : (match?.away?.color || '#f43f5e');

  // Compute tactical coordinates for the 11 starters
  const positionedStarters = useMemo(() => {
    if (!currentRoster.starters || currentRoster.starters.length === 0) return [];
    return getFormationCoordinates(currentRoster.formation, currentRoster.starters);
  }, [currentRoster.formation, currentRoster.starters]);

  // Selected player's located actions (shots and events)
  const playerActions = useMemo(() => {
    if (!selectedPlayer) return { shots: [], events: [] };
    const pShots = shots.filter(
      (s) =>
        s.player_id === selectedPlayer.id ||
        s.player_name?.toLowerCase().includes(selectedPlayer.name?.toLowerCase())
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Tactical Lineups & Formations
          </h3>
          <p className="text-xs text-slate-500">
            Tap a player to highlight their tactical role and match actions.
          </p>
        </div>

        {/* Team Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800 border border-slate-700">
          {rosters.map((r, idx) => (
            <button
              key={r.team_id || idx}
              type="button"
              onClick={() => {
                setSelectedTeamIdx(idx);
                setSelectedPlayer(null);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedTeamIdx === idx
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r.team_name} ({r.formation})
            </button>
          ))}
        </div>
      </div>

      {/* Vertical Tactical Pitch Container */}
      <div className="relative w-full max-w-md mx-auto aspect-[100/120] rounded-2xl border border-slate-700/60 bg-slate-950/80 shadow-2xl overflow-hidden select-none">
        <svg
          viewBox="0 0 100 120"
          className="w-full h-full text-slate-700/60"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.6"
        >
          {/* Grass bands */}
          <defs>
            <pattern id="tactical-stripes" width="100" height="24" patternUnits="userSpaceOnUse">
              <rect width="100" height="12" fill="rgba(255,255,255,0.015)" />
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

          {/* If a player is selected, show their actions on the tactical pitch */}
          {selectedPlayer && (
            <g className="actions-overlay">
              {playerActions.shots.map((s) => (
                <circle
                  key={`shot-${s.id}`}
                  cx={s.y}
                  cy={100 - s.x}
                  r={3}
                  fill={s.outcome === 'goal' ? '#fbbf24' : '#38bdf8'}
                  stroke="#ffffff"
                  strokeWidth={0.8}
                  className="animate-pulse"
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
                className="cursor-pointer transition-transform duration-200"
                onClick={() => setSelectedPlayer(isSelected ? null : player)}
              >
                {/* Active Player Glow */}
                {isSelected && (
                  <circle
                    cx={player.x}
                    cy={player.y}
                    r={6.8}
                    fill="none"
                    stroke="#00ff87"
                    strokeWidth={1.2}
                    className="animate-ping"
                  />
                )}

                {/* Jersey Badge */}
                <circle
                  cx={player.x}
                  cy={player.y}
                  r={4.8}
                  fill={isSelected ? '#00ff87' : '#0f172a'}
                  stroke={isSelected ? '#ffffff' : teamColor}
                  strokeWidth={1.2}
                  className="shadow-md"
                />

                {/* Shirt Number */}
                <text
                  x={player.x}
                  y={player.y + 1.4}
                  textAnchor="middle"
                  fontSize="4.2"
                  fontWeight="bold"
                  fill={isSelected ? '#0f172a' : '#ffffff'}
                  fontFamily="monospace"
                >
                  {player.jersey || player.formation_place || '•'}
                </text>

                {/* Player Surname Label */}
                <text
                  x={player.x}
                  y={player.y + 6.8}
                  textAnchor="middle"
                  fontSize="2.8"
                  fontWeight="600"
                  fill={isSelected ? '#00ff87' : '#e2e8f0'}
                  stroke="#000000"
                  strokeWidth="0.3"
                  paintOrder="stroke"
                >
                  {surname}
                </text>

                {/* Status Badges: Goal, Card */}
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
              </g>
            );
          })}
        </svg>

        {/* Selected Player Tactical Drawer / Overlay */}
        {selectedPlayer && (
          <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-slate-700 bg-slate-900/95 p-3.5 text-xs shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded font-mono font-bold text-xs"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: teamColor }}
                >
                  #{selectedPlayer.jersey}
                </span>
                <div>
                  <h4 className="font-bold text-slate-200 text-sm leading-tight">
                    {selectedPlayer.name}
                  </h4>
                  <span className="text-[10px] text-slate-400">
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
                      match?.leagueSlug || 'eng.1'
                    )
                  }
                  className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  Scout Profile →
                </button>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
              <div className="rounded-lg bg-slate-800/60 p-1.5 border border-slate-700/40">
                <span className="block text-[9px] text-slate-500 uppercase">xG</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {selectedPlayer.xg?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="rounded-lg bg-slate-800/60 p-1.5 border border-slate-700/40">
                <span className="block text-[9px] text-slate-500 uppercase">Shots</span>
                <span className="font-bold text-slate-200">
                  {selectedPlayer.shots} ({selectedPlayer.shots_on_target})
                </span>
              </div>
              <div className="rounded-lg bg-slate-800/60 p-1.5 border border-slate-700/40">
                <span className="block text-[9px] text-slate-500 uppercase">Goals</span>
                <span className="font-bold text-amber-400">{selectedPlayer.goals}</span>
              </div>
              <div className="rounded-lg bg-slate-800/60 p-1.5 border border-slate-700/40">
                <span className="block text-[9px] text-slate-500 uppercase">Fouls (W/C)</span>
                <span className="font-bold text-slate-300">
                  {selectedPlayer.fouls_won}/{selectedPlayer.fouls_committed}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bench / Substitutes List */}
      {currentRoster.bench && currentRoster.bench.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800/80">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Bench & Substitutes
          </span>
          <div className="flex flex-wrap gap-1.5">
            {currentRoster.bench.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/40 border border-slate-700/40 text-xs text-slate-300"
              >
                <span className="text-slate-500 font-mono text-[10px]">#{b.jersey}</span>
                <span>{b.name}</span>
                {b.subbed_in && <span className="text-emerald-400 text-[10px]">↑ In</span>}
                {b.yellow_cards > 0 && <span className="text-yellow-400 text-[10px]">🟨</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
