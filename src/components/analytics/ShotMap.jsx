import { useState, useMemo } from 'react';
import HalfPitch from './pitch/HalfPitch';

const OUTCOME_CONFIG = {
  goal: { label: 'Goal', color: '#fbbf24', border: '#ffffff' },
  saved: { label: 'On Target', color: '#38bdf8', border: '#bae6fd' },
  missed: { label: 'Off Target', color: '#f43f5e', border: '#fecdd3' },
  blocked: { label: 'Blocked', color: '#94a3b8', border: '#cbd5e1' },
};

export default function ShotMap({ match, shots = [] }) {
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedPlayer, setSelectedPlayer] = useState('all');
  const [hoveredShot, setHoveredShot] = useState(null);

  const home = match?.home || {};
  const away = match?.away || {};

  // Unique players list
  const players = useMemo(() => {
    const map = new Map();
    shots.forEach((s) => {
      if (s.player_name) {
        map.set(s.player_name, {
          name: s.player_name,
          teamId: s.team_id,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [shots]);

  // Filter shots
  const filteredShots = useMemo(() => {
    return shots.filter((s) => {
      if (selectedTeam !== 'all' && s.team_id !== selectedTeam) {
        return false;
      }
      if (selectedPlayer !== 'all' && s.player_name !== selectedPlayer) {
        return false;
      }
      return true;
    });
  }, [shots, selectedTeam, selectedPlayer]);

  // Summary stats for filtered shots
  const stats = useMemo(() => {
    const totalShots = filteredShots.length;
    const goals = filteredShots.filter((s) => s.outcome === 'goal').length;
    const onTarget = filteredShots.filter(
      (s) => s.outcome === 'goal' || s.outcome === 'saved'
    ).length;
    const totalXg = filteredShots.reduce((acc, s) => acc + (s.xg || 0), 0);
    return { totalShots, goals, onTarget, totalXg };
  }, [filteredShots]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Shot Map
          </h3>
          <p className="text-xs text-slate-500">
            Dot size indicates xG value. Attacking towards right goal.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Team Filter */}
          <select
            value={selectedTeam}
            onChange={(e) => {
              setSelectedTeam(e.target.value);
              setSelectedPlayer('all');
            }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Teams</option>
            {home.id && <option value={home.id}>{home.name || 'Home'}</option>}
            {away.id && <option value={away.id}>{away.name || 'Away'}</option>}
          </select>

          {/* Player Filter */}
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none max-w-[150px] truncate"
          >
            <option value="all">All Players</option>
            {players
              .filter((p) => selectedTeam === 'all' || p.teamId === selectedTeam)
              .map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-4 gap-2 mb-4 text-center">
        <div className="rounded-lg bg-slate-800/40 p-2 border border-slate-700/40">
          <span className="block text-[10px] text-slate-500 uppercase">Shots</span>
          <span className="text-base font-bold text-slate-200">{stats.totalShots}</span>
        </div>
        <div className="rounded-lg bg-slate-800/40 p-2 border border-slate-700/40">
          <span className="block text-[10px] text-slate-500 uppercase">Goals</span>
          <span className="text-base font-bold text-amber-400">{stats.goals}</span>
        </div>
        <div className="rounded-lg bg-slate-800/40 p-2 border border-slate-700/40">
          <span className="block text-[10px] text-slate-500 uppercase">On Target</span>
          <span className="text-base font-bold text-sky-400">{stats.onTarget}</span>
        </div>
        <div className="rounded-lg bg-slate-800/40 p-2 border border-slate-700/40">
          <span className="block text-[10px] text-slate-500 uppercase">Total xG</span>
          <span className="text-base font-bold text-emerald-400 font-mono">
            {stats.totalXg.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Pitch with Shots */}
      <div className="relative">
        <HalfPitch>
          {filteredShots.map((shot) => {
            const svgX = shot.x * 1.05;
            const svgY = (100 - shot.y) * 0.68;
            const config = OUTCOME_CONFIG[shot.outcome] || OUTCOME_CONFIG.missed;
            const radius = Math.max(1.1, Math.min(3.2, 1.1 + (shot.xg || 0) * 3.2));
            const isHovered = hoveredShot?.id === shot.id;

            return (
              <g
                key={shot.id}
                className="cursor-pointer transition-transform duration-200"
                onMouseEnter={() => setHoveredShot(shot)}
                onMouseLeave={() => setHoveredShot(null)}
                onClick={() => setHoveredShot(shot)}
              >
                {/* Glow ring on hover or goal */}
                {(isHovered || shot.outcome === 'goal') && (
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r={radius + (isHovered ? 1.5 : 0.8)}
                    fill="none"
                    stroke={config.color}
                    strokeWidth={0.5}
                    opacity={0.8}
                    className="animate-pulse"
                  />
                )}
                {/* Shot dot */}
                <circle
                  cx={svgX}
                  cy={svgY}
                  r={radius}
                  fill={config.color}
                  stroke={config.border}
                  strokeWidth={0.4}
                />
              </g>
            );
          })}
        </HalfPitch>

        {/* Hover Tooltip Overlay */}
        {hoveredShot && (
          <div className="absolute bottom-2 left-2 right-2 max-w-sm mx-auto rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-xs shadow-2xl backdrop-blur-md transition-all">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
              <span className="font-bold text-slate-200">
                {hoveredShot.player_name || 'Unknown Player'} ({hoveredShot.team_name})
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {Number(hoveredShot.xg).toFixed(2)} xG
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 mb-1.5">
              <div>Minute: <span className="text-slate-200">{hoveredShot.minute}&apos;</span></div>
              <div>Outcome: <span className="font-semibold text-slate-200 uppercase text-[10px]">{hoveredShot.outcome}</span></div>
              <div>Body part: <span className="text-slate-200 capitalize">{hoveredShot.body_part?.replace('_', ' ') || 'Foot'}</span></div>
              <div>Situation: <span className="text-slate-200 capitalize">{hoveredShot.situation?.replace('_', ' ') || 'Open play'}</span></div>
            </div>
            {hoveredShot.text && (
              <p className="text-[11px] text-slate-400 italic line-clamp-2">
                &ldquo;{hoveredShot.text}&rdquo;
              </p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
        {Object.entries(OUTCOME_CONFIG).map(([key, item]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-slate-500">
          <span>(Size = xG chance)</span>
        </div>
      </div>
    </div>
  );
}
