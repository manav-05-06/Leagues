import { useState, useMemo } from 'react';
import Pitch from './pitch/Pitch';

const EVENT_TYPE_CONFIG = {
  all: { label: 'All Events', color: '#94a3b8' },
  corner: { label: 'Corners', color: '#38bdf8', icon: '🚩' },
  foul: { label: 'Fouls', color: '#f59e0b', icon: '⚠️' },
  offside: { label: 'Offsides', color: '#a855f7', icon: '🛑' },
};

export default function EventMap({ match, events = [] }) {
  const [selectedType, setSelectedType] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [showZones, setShowZones] = useState(true);
  const [hoveredEvent, setHoveredEvent] = useState(null);

  const home = match?.home || {};
  const away = match?.away || {};
  const homeId = String(home.id || '');
  const awayId = String(away.id || '');

  // Filter events with coordinates
  const locatedEvents = useMemo(() => {
    return events.filter((e) => e.x != null && e.y != null);
  }, [events]);

  const filteredEvents = useMemo(() => {
    return locatedEvents.filter((e) => {
      if (selectedType !== 'all' && e.type !== selectedType) {
        return false;
      }
      if (selectedTeam !== 'all' && String(e.team_id) !== selectedTeam) {
        return false;
      }
      return true;
    });
  }, [locatedEvents, selectedType, selectedTeam]);

  // Calculate Attacking Channel distribution (Attacking third x > 66)
  const channelDistribution = useMemo(() => {
    const attackingEvents = locatedEvents.filter((e) => {
      if (e.x < 66) return false;
      if (selectedTeam !== 'all' && String(e.team_id) !== selectedTeam) return false;
      return true;
    });

    let left = 0;
    let center = 0;
    let right = 0;

    attackingEvents.forEach((e) => {
      // In ESPN, low y is attacker's right, high y is attacker's left
      if (e.y > 60) {
        left += 1;
      } else if (e.y < 40) {
        right += 1;
      } else {
        center += 1;
      }
    });

    const total = left + center + right;
    return {
      total,
      leftPct: total > 0 ? Math.round((left / total) * 100) : 33,
      centerPct: total > 0 ? Math.round((center / total) * 100) : 34,
      rightPct: total > 0 ? Math.round((right / total) * 100) : 33,
    };
  }, [locatedEvents, selectedTeam]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Pitch Action & Event Map
          </h3>
          <p className="text-xs text-slate-500">
            Locations of set pieces, fouls, and offsides across the pitch.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="corner">Corners</option>
            <option value="foul">Fouls</option>
            <option value="offside">Offsides</option>
          </select>

          {/* Team Filter */}
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">Both Teams</option>
            {home.id && <option value={homeId}>{home.name || 'Home'}</option>}
            {away.id && <option value={awayId}>{away.name || 'Away'}</option>}
          </select>

          {/* Toggle 3x3 Zones */}
          <button
            type="button"
            onClick={() => setShowZones(!showZones)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors ${
              showZones
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-slate-700 bg-slate-800 text-slate-400'
            }`}
          >
            3×3 Grid
          </button>
        </div>
      </div>

      {/* Attacking Channels Strip */}
      <div className="mb-4 p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
        <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
          <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
            Final Third Channel Distribution
          </span>
          <span className="text-[11px] text-slate-500">{channelDistribution.total} attacking actions</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-800/70 p-1.5 border border-slate-700/40">
            <span className="block text-[10px] text-slate-400">Left Channel</span>
            <span className="text-sm font-bold text-sky-400 font-mono">
              {channelDistribution.leftPct}%
            </span>
          </div>
          <div className="rounded-lg bg-slate-800/70 p-1.5 border border-slate-700/40">
            <span className="block text-[10px] text-slate-400">Center</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {channelDistribution.centerPct}%
            </span>
          </div>
          <div className="rounded-lg bg-slate-800/70 p-1.5 border border-slate-700/40">
            <span className="block text-[10px] text-slate-400">Right Channel</span>
            <span className="text-sm font-bold text-rose-400 font-mono">
              {channelDistribution.rightPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Pitch Rendering */}
      <div className="relative">
        <Pitch showZones={showZones}>
          {filteredEvents.map((evt) => {
            const isHome = String(evt.team_id) === homeId;
            // Home attacks towards right (x=105), Away attacks towards left (x=0)
            const svgX = isHome ? evt.x * 1.05 : (100 - evt.x) * 1.05;
            const svgY = isHome ? (100 - evt.y) * 0.68 : evt.y * 0.68;

            const config = EVENT_TYPE_CONFIG[evt.type] || EVENT_TYPE_CONFIG.all;
            const isHovered = hoveredEvent?.id === evt.id;

            return (
              <g
                key={`evt-${evt.id}`}
                className="cursor-pointer transition-transform duration-200"
                onMouseEnter={() => setHoveredEvent(evt)}
                onMouseLeave={() => setHoveredEvent(null)}
                onClick={() => setHoveredEvent(evt)}
              >
                {isHovered && (
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r={2.5}
                    fill="none"
                    stroke={config.color}
                    strokeWidth={0.5}
                    className="animate-ping"
                  />
                )}
                <circle
                  cx={svgX}
                  cy={svgY}
                  r={1.2}
                  fill={config.color}
                  stroke="#ffffff"
                  strokeWidth={0.3}
                  opacity={0.85}
                />
              </g>
            );
          })}
        </Pitch>

        {/* Hover Tooltip Overlay */}
        {hoveredEvent && (
          <div className="absolute bottom-2 left-2 right-2 max-w-sm mx-auto rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-xs shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
              <span className="font-bold text-slate-200 capitalize">
                {hoveredEvent.type} · {hoveredEvent.minute}&apos;
              </span>
              <span className="text-[11px] text-slate-400">
                {hoveredEvent.team_name}
              </span>
            </div>
            {hoveredEvent.player_name && (
              <p className="text-slate-300 font-medium">{hoveredEvent.player_name}</p>
            )}
            {hoveredEvent.text && (
              <p className="text-[11px] text-slate-400 italic line-clamp-2 mt-0.5">
                &ldquo;{hoveredEvent.text}&rdquo;
              </p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-5 mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
          <span>Corner</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Foul</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span>Offside</span>
        </div>
      </div>
    </div>
  );
}
