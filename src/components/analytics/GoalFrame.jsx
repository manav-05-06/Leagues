import { useState, useMemo } from 'react';
import GoalMouth from './pitch/GoalMouth';
import { getGoalMouthCoords } from './pitch/pitchUtils';
import InfoButton from './InfoButton';
import Legend from './Legend';

const INFO_TEXT =
  'Where on-target shots were heading in the goal, and whether the keeper stopped them.';

function formatOutcome(outcome) {
  if (!outcome) return 'Shot';
  switch (outcome.toLowerCase()) {
    case 'goal':
      return 'Goal';
    case 'saved':
      return 'Saved';
    case 'woodwork':
      return 'Hit woodwork';
    default:
      return outcome;
  }
}

export default function GoalFrame({
  shots = [],
  match = {},
  colors = { home: '#00ff87', away: '#00f2fe', draw: '#64748b' },
}) {
  const home = match?.home || {};
  const away = match?.away || {};

  // Filter to only shots on target (goals and saves) or woodwork
  const onTargetShots = useMemo(() => {
    return shots.filter((s) => {
      const outcome = (s.outcome || '').toLowerCase();
      if (outcome === 'goal' || outcome === 'saved') return true;
      const { onTarget } = getGoalMouthCoords(s);
      return onTarget;
    });
  }, [shots]);

  const [selectedTeam, setSelectedTeam] = useState('all');

  const homeOnTargetCount = useMemo(
    () => onTargetShots.filter((s) => String(s.team_id) === String(home.id)).length,
    [onTargetShots, home.id]
  );
  const awayOnTargetCount = useMemo(
    () => onTargetShots.filter((s) => String(s.team_id) === String(away.id)).length,
    [onTargetShots, away.id]
  );

  const filteredShots = useMemo(() => {
    if (selectedTeam === 'all') return onTargetShots;
    return onTargetShots.filter((s) => String(s.team_id) === String(selectedTeam));
  }, [onTargetShots, selectedTeam]);

  // Default selected shot: highest xG goal or highest xG shot
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
        <h3 className="analytics-card-title">Shots on Target</h3>
        <InfoButton text={INFO_TEXT} />
      </div>

      <Legend
        teamA={{ name: home.name || 'Home', color: colors.home }}
        teamB={{ name: away.name || 'Away', color: colors.away }}
      />

      {/* Filter Chips */}
      <div className="shots-filter-chips" role="group" aria-label="Filter on-target shots by team">
        <button
          type="button"
          onClick={() => {
            setSelectedTeam('all');
            setTappedShot(null);
          }}
          className={`filter-chip ${selectedTeam === 'all' ? 'active' : ''}`}
        >
          Both teams ({onTargetShots.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedTeam(home.id);
            setTappedShot(null);
          }}
          className={`filter-chip ${selectedTeam === home.id ? 'active' : ''}`}
        >
          {home.name || 'Home'} ({homeOnTargetCount})
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedTeam(away.id);
            setTappedShot(null);
          }}
          className={`filter-chip ${selectedTeam === away.id ? 'active' : ''}`}
        >
          {away.name || 'Away'} ({awayOnTargetCount})
        </button>
      </div>

      {/* Goal Mouth SVG */}
      <div className="goal-frame-stage">
        <GoalMouth>
          {filteredShots.map((shot) => {
            const { x, y } = getGoalMouthCoords(shot);
            const isHomeShot = String(shot.team_id) === String(home.id);
            const teamColor = isHomeShot ? colors.home : colors.away;
            const radius = Math.max(2.2, Math.min(5.5, 2.2 + (shot.xg || 0) * 4.0));
            const isSelected = activeShot?.id === shot.id;
            const outcome = (shot.outcome || '').toLowerCase();

            return (
              <g
                key={`gm-${shot.id}`}
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
                    cx={x}
                    cy={y}
                    r={radius + 2.0}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={1.2}
                    opacity={0.9}
                  />
                )}

                {/* Outcome shape: filled for goal, open for saved/other */}
                {outcome === 'goal' ? (
                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    fill={teamColor}
                    stroke="#ffffff"
                    strokeWidth={0.8}
                  />
                ) : (
                  <circle
                    cx={x}
                    cy={y}
                    r={radius}
                    fill="transparent"
                    stroke={teamColor}
                    strokeWidth={1.6}
                  />
                )}
              </g>
            );
          })}
        </GoalMouth>
      </div>

      {/* Legend */}
      <div className="shot-map-legend">
        <div className="shot-legend-items">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '13px' }}>●</span> Goal
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '13px' }}>○</span> Saved / On frame
          </span>
        </div>
        <div>Bigger circle = better chance</div>
      </div>

      {/* Tapped Detail Card */}
      {activeShot ? (
        <div className="shot-detail-card" aria-live="polite">
          <div className="shot-detail-title">
            {activeShot.minute}&apos; {activeShot.player_name || 'Player'} ({activeShot.team_name || ''}) ·{' '}
            {formatOutcome(activeShot.outcome)}
          </div>
          <div className="shot-detail-meta">
            {Math.round(activeShot.distance || 0)} m from goal ·{' '}
            {Math.round((activeShot.xg || 0) * 100)}% chance
            {activeShot.height ? ` · ${activeShot.height} height` : ''}
          </div>
        </div>
      ) : (
        <div className="shot-detail-card">
          <div className="shot-detail-meta" style={{ textAlign: 'center' }}>
            Tap any shot on the goal frame to see details
          </div>
        </div>
      )}
    </div>
  );
}
