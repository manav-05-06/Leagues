import { useState, useMemo } from 'react';
import GoalMouth from './pitch/GoalMouth';
import { getGoalMouthCoords } from './pitch/pitchUtils';

const OUTCOME_CONFIG = {
  goal: { label: 'Goal', color: '#fbbf24', border: '#ffffff' },
  saved: { label: 'Saved / On Target', color: '#38bdf8', border: '#bae6fd' },
  missed: { label: 'Off Target', color: '#f43f5e', border: '#fecdd3' },
  blocked: { label: 'Blocked', color: '#94a3b8', border: '#cbd5e1' },
};

export default function GoalMouthView({ match, shots = [] }) {
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [hoveredShot, setHoveredShot] = useState(null);

  const home = match?.home || {};
  const away = match?.away || {};

  // Filter shots
  const filteredShots = useMemo(() => {
    return shots.filter((s) => {
      if (selectedTeam !== 'all' && s.team_id !== selectedTeam) {
        return false;
      }
      return true;
    });
  }, [shots, selectedTeam]);

  // Count inside the goal frame (goals + saved)
  const insideGoalCount = filteredShots.filter(
    (s) => s.outcome === 'goal' || s.outcome === 'saved'
  ).length;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Goal-Mouth Placement
          </h3>
          <p className="text-xs text-slate-500">
            Where shots ended from the shooter&apos;s perspective.
          </p>
        </div>

        {/* Team Filter */}
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
        >
          <option value="all">All Teams</option>
          {home.id && <option value={home.id}>{home.name || 'Home'}</option>}
          {away.id && <option value={away.id}>{away.name || 'Away'}</option>}
        </select>
      </div>

      {/* Metrics */}
      <div className="flex items-center justify-around mb-4 py-2 rounded-xl bg-slate-800/40 border border-slate-700/40 text-center">
        <div>
          <span className="block text-[10px] text-slate-500 uppercase">On Frame</span>
          <span className="text-sm font-bold text-sky-400">{insideGoalCount}</span>
        </div>
        <div className="h-6 w-px bg-slate-700/60" />
        <div>
          <span className="block text-[10px] text-slate-500 uppercase">Goals</span>
          <span className="text-sm font-bold text-amber-400">
            {filteredShots.filter((s) => s.outcome === 'goal').length}
          </span>
        </div>
        <div className="h-6 w-px bg-slate-700/60" />
        <div>
          <span className="block text-[10px] text-slate-500 uppercase">Off Target</span>
          <span className="text-sm font-bold text-rose-400">
            {filteredShots.filter((s) => s.outcome === 'missed').length}
          </span>
        </div>
      </div>

      {/* Goal Mouth SVG */}
      <div className="relative">
        <GoalMouth>
          {filteredShots.map((shot) => {
            const { x, y } = getGoalMouthCoords(shot);
            const config = OUTCOME_CONFIG[shot.outcome] || OUTCOME_CONFIG.missed;
            const radius = Math.max(1.8, Math.min(4.0, 1.8 + (shot.xg || 0) * 3.0));
            const isHovered = hoveredShot?.id === shot.id;

            return (
              <g
                key={`gm-${shot.id}`}
                className="cursor-pointer transition-transform duration-200"
                onMouseEnter={() => setHoveredShot(shot)}
                onMouseLeave={() => setHoveredShot(null)}
                onClick={() => setHoveredShot(shot)}
              >
                {(isHovered || shot.outcome === 'goal') && (
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 1.2}
                    fill="none"
                    stroke={config.color}
                    strokeWidth={0.6}
                    opacity={0.8}
                    className="animate-pulse"
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={config.color}
                  stroke={config.border}
                  strokeWidth={0.5}
                />
              </g>
            );
          })}
        </GoalMouth>

        {/* Hover Tooltip Overlay */}
        {hoveredShot && (
          <div className="absolute bottom-2 left-2 right-2 max-w-sm mx-auto rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-xs shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
              <span className="font-bold text-slate-200">
                {hoveredShot.player_name || 'Shooter'} ({hoveredShot.team_name})
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {Number(hoveredShot.xg).toFixed(2)} xG
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Minute: <b className="text-white">{hoveredShot.minute}&apos;</b></span>
              <span className="capitalize">{hoveredShot.outcome} ({hoveredShot.height || 'standard'})</span>
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
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>Goal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
          <span>Saved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          <span>Off Target / Woodwork</span>
        </div>
      </div>
    </div>
  );
}
