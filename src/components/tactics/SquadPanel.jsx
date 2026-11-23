import { useMemo } from 'react';

const POS_ORDER = [
  { key: 'G', label: 'Goalkeepers' },
  { key: 'D', label: 'Defenders' },
  { key: 'M', label: 'Midfielders' },
  { key: 'F', label: 'Forwards' },
];

export default function SquadPanel({
  side,
  team,
  sourceLabel,
  selectedPlayerId,
  onSelectSquadPlayer,
  onDragStartSquadPlayer,
  onOpenTeamPicker,
}) {
  const onPitchMap = useMemo(() => {
    const map = new Map();
    (team.onPitch || []).forEach((p) => map.set(String(p.id), p));
    return map;
  }, [team.onPitch]);

  const groupedSquad = useMemo(() => {
    const groups = { G: [], D: [], M: [], F: [] };
    (team.squad || []).forEach((player) => {
      const pos = player.pos || 'M';
      if (groups[pos]) {
        groups[pos].push(player);
      } else {
        groups.M.push(player);
      }
    });
    return groups;
  }, [team.squad]);

  return (
    <div className="tactics-squad-panel">
      <div className="tactics-squad-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            className="tactics-squad-title"
            style={{ cursor: onOpenTeamPicker ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => onOpenTeamPicker && onOpenTeamPicker(side)}
            title={onOpenTeamPicker ? 'Click to change team' : undefined}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: team.color || '#00ff87',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {team.name}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              ({team.onPitch?.length || 0}/11)
            </span>
          </h3>
          <div className="tactics-squad-source-label">
            {sourceLabel || 'Pick starting lineup'}
          </div>
        </div>
        {onOpenTeamPicker && (
          <button
            type="button"
            className="tactics-btn"
            style={{ padding: '4px 8px', fontSize: '11px', minHeight: '28px', whiteSpace: 'nowrap' }}
            onClick={() => onOpenTeamPicker(side)}
            title={`Change team for side ${side ? side.toUpperCase() : ''}`}
          >
            Change
          </button>
        )}
      </div>

      {POS_ORDER.map(({ key, label }) => {
        const players = groupedSquad[key] || [];
        if (players.length === 0) return null;

        return (
          <div key={key} className="tactics-pos-group">
            <span className="tactics-pos-title">{label}</span>
            <div className="tactics-chips-wrap">
              {players.map((p) => {
                const isOnPitch = onPitchMap.has(String(p.id));
                const isSelected = selectedPlayerId === p.id;

                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`squad-player-chip ${isOnPitch ? 'on-pitch' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelectSquadPlayer(p, side)}
                    onPointerDown={(e) => onDragStartSquadPlayer && onDragStartSquadPlayer(e, p, side)}
                    title={isOnPitch ? `${p.name} (On pitch - click to bench)` : `${p.name} (Click to place on pitch)`}
                  >
                    {p.jersey ? <span className="squad-chip-jersey">#{p.jersey}</span> : null}
                    <span>{p.shortName || p.name}</span>
                    {isOnPitch && <span style={{ color: 'var(--accent-primary, #00ff87)', fontSize: '10px' }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {team.squad?.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>
          No players loaded. Choose a team above to view squad.
        </div>
      )}
    </div>
  );
}
