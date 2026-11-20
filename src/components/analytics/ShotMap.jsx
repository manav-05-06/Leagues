import { useState, useMemo } from 'react';
import HalfPitch from './pitch/HalfPitch';
import InfoButton from './InfoButton';
import Legend from './Legend';

const INFO_TEXT =
  'Each circle is a shot, placed where it was taken from. Bigger circle = better chance. Filled = goal.';

function formatOutcome(outcome) {
  if (!outcome) return 'Shot';
  switch (outcome.toLowerCase()) {
    case 'goal':
      return 'Goal';
    case 'saved':
      return 'Saved';
    case 'blocked':
      return 'Blocked';
    case 'missed':
      return 'Missed';
    case 'woodwork':
      return 'Hit woodwork';
    default:
      return outcome;
  }
}

export default function ShotMap({
  shots = [],
  match = {},
  colors = { home: '#00ff87', away: '#00f2fe', draw: '#64748b' },
}) {
  const home = match?.home || {};
  const away = match?.away || {};

  const [selectedTeam, setSelectedTeam] = useState('all');

  const homeShotsCount = useMemo(
    () => shots.filter((s) => String(s.team_id) === String(home.id)).length,
    [shots, home.id]
  );
  const awayShotsCount = useMemo(
    () => shots.filter((s) => String(s.team_id) === String(away.id)).length,
    [shots, away.id]
  );

  const filteredShots = useMemo(() => {
    if (selectedTeam === 'all') return shots;
    return shots.filter((s) => String(s.team_id) === String(selectedTeam));
  }, [shots, selectedTeam]);

  // Default selected shot: highest xG goal, or highest xG shot, or first shot
  const defaultShot = useMemo(() => {
    if (filteredShots.length === 0) return null;
    const goals = filteredShots.filter((s) => s.outcome === 'goal');
    if (goals.length > 0) {
      return goals.slice().sort((a, b) => (b.xg || 0) - (a.xg || 0))[0];
    }
    return filteredShots.slice().sort((a, b) => (b.xg || 0) - (a.xg || 0))[0];
  }, [filteredShots]);

  const [tappedShot, setTappedShot] = useState(null);
  const activeShot = tappedShot || defaultShot;

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <h3 className="analytics-card-title">Shot Map</h3>
        <InfoButton text={INFO_TEXT} />
      </div>

      <Legend
        teamA={{ name: home.name || 'Home', color: colors.home }}
        teamB={{ name: away.name || 'Away', color: colors.away }}
      />

      {/* Filter Chips */}
      <div className="shots-filter-chips" role="group" aria-label="Filter shots by team">
        <button
          type="button"
          onClick={() => {
            setSelectedTeam('all');
            setTappedShot(null);
          }}
          className={`filter-chip ${selectedTeam === 'all' ? 'active' : ''}`}
        >
          Both teams ({shots.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedTeam(home.id);
            setTappedShot(null);
          }}
          className={`filter-chip ${selectedTeam === home.id ? 'active' : ''}`}
        >
          {home.name || 'Home'} ({homeShotsCount})
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedTeam(away.id);
            setTappedShot(null);
          }}
          className={`filter-chip ${selectedTeam === away.id ? 'active' : ''}`}
        >
          {away.name || 'Away'} ({awayShotsCount})
        </button>
      </div>

      {/* Half Pitch View */}
      <div className="shot-pitch-stage">
        <HalfPitch>
          {filteredShots.map((shot) => {
            const svgX = shot.x * 1.05;
            const svgY = (100 - shot.y) * 0.68;
            const isHomeShot = String(shot.team_id) === String(home.id);
            const teamColor = isHomeShot ? colors.home : colors.away;
            const radius = Math.max(1.8, Math.min(5.5, 1.8 + (shot.xg || 0) * 4.5));
            const isSelected = activeShot?.id === shot.id;
            const outcome = (shot.outcome || '').toLowerCase();

            return (
              <g
                key={shot.id}
                className="shot-symbol"
                tabIndex={0}
                role="button"
                aria-label={`${shot.player_name || 'Player'}, minute ${shot.minute}, ${outcome}, ${Math.round((shot.xg || 0) * 100)}% chance`}
                onClick={() => setTappedShot(shot)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setTappedShot(shot);
                  }
                }}
              >
                {/* Active Selection Glow / Ring */}
                {isSelected && (
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r={radius + 2.0}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={1.2}
                    opacity={0.9}
                  />
                )}

                {/* Shot Symbol by outcome */}
                {outcome === 'goal' ? (
                  // Filled circle for goal
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r={radius}
                    fill={teamColor}
                    stroke="#ffffff"
                    strokeWidth={0.8}
                  />
                ) : outcome === 'saved' ? (
                  // Open circle for saved
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r={radius}
                    fill="transparent"
                    stroke={teamColor}
                    strokeWidth={1.5}
                  />
                ) : (
                  // Muted dot for missed / blocked / woodwork
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r={Math.max(1.3, radius * 0.7)}
                    fill={teamColor}
                    opacity={0.45}
                  />
                )}
              </g>
            );
          })}
        </HalfPitch>
      </div>

      {/* Legend & Size explanation */}
      <div className="shot-map-legend">
        <div className="shot-legend-items">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '13px' }}>●</span> Goal
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '13px' }}>○</span> Saved
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '13px' }}>·</span> Missed/blocked
          </span>
        </div>
        <div>Bigger circle = better chance</div>
      </div>

      {/* Tapped Shot Detail Card */}
      {activeShot ? (
        <div className="shot-detail-card" aria-live="polite">
          <div className="shot-detail-title">
            {activeShot.minute}&apos; {activeShot.player_name || 'Player'} ({activeShot.team_name || ''}) ·{' '}
            {formatOutcome(activeShot.outcome)}
          </div>
          <div className="shot-detail-meta">
            {Math.round(activeShot.distance || 0)} m from goal ·{' '}
            {Math.round((activeShot.xg || 0) * 100)}% chance
            {activeShot.body_part ? ` · ${activeShot.body_part.replace('_', ' ')}` : ''}
          </div>
        </div>
      ) : (
        <div className="shot-detail-card">
          <div className="shot-detail-meta" style={{ textAlign: 'center' }}>
            Tap any shot on the pitch to see details
          </div>
        </div>
      )}
    </div>
  );
}
