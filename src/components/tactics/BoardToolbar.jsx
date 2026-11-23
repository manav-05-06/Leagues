import { ArrowUpDown, RotateCcw, RotateCw, Share2, Download, Bookmark, FolderOpen } from 'lucide-react';

const FORMATION_OPTIONS = [
  '4-2-3-1',
  '4-3-3',
  '4-4-2',
  '4-1-4-1',
  '4-4-1-1',
  '4-3-2-1',
  '4-1-2-1-2',
  '3-5-2',
  '3-4-3',
  '3-4-2-1',
  '5-3-2',
  '5-4-1',
];

export default function BoardToolbar({
  board,
  hasMatchLineup = false,
  canUndo = false,
  onOpenTeamPicker,
  onChangeFormation,
  onSelectStartFrom,
  onFlip,
  onUndo,
  onReset,
  onSaveBoard,
  onOpenSavedBoards,
  onShareLink,
  onExportImage,
}) {
  const teamA = board.teams.a;
  const teamB = board.teams.b;

  return (
    <div className="tactics-toolbar">
      {/* Top Matchup Header with Team Pickers and Formations */}
      <div className="tactics-toolbar-top">
        <div className="tactics-matchup-heading">
          {/* Team A Button */}
          <button
            type="button"
            className="tactics-team-trigger-btn"
            onClick={() => onOpenTeamPicker('a')}
            title="Click to choose Team A"
            aria-label={`Choose Team A (currently ${teamA.name || 'Team A'})`}
          >
            {teamA.logo ? (
              <img src={teamA.logo} alt={teamA.name} className="tactics-team-trigger-logo" />
            ) : (
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: teamA.color || '#00ff87',
                }}
              />
            )}
            <span>{teamA.name || 'Select Team A'}</span>
            <span style={{ fontSize: '11px', color: 'var(--accent-primary, #00ff87)' }}>▾</span>
          </button>

          {/* Team A Formation */}
          <select
            value={teamA.formation || '4-3-3'}
            onChange={(e) => onChangeFormation('a', e.target.value)}
            className="tactics-formation-select"
            aria-label={`${teamA.name} formation`}
          >
            {FORMATION_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <span className="tactics-vs-badge">vs</span>

          {/* Team B Button */}
          <button
            type="button"
            className="tactics-team-trigger-btn"
            onClick={() => onOpenTeamPicker('b')}
            title="Click to choose Team B"
            aria-label={`Choose Team B (currently ${teamB.name || 'Team B'})`}
          >
            {teamB.logo ? (
              <img src={teamB.logo} alt={teamB.name} className="tactics-team-trigger-logo" />
            ) : (
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: teamB.color || '#00f2fe',
                }}
              />
            )}
            <span>{teamB.name || 'Select Team B'}</span>
            <span style={{ fontSize: '11px', color: 'var(--accent-secondary, #00f2fe)' }}>▾</span>
          </button>

          {/* Team B Formation */}
          <select
            value={teamB.formation || '4-3-3'}
            onChange={(e) => onChangeFormation('b', e.target.value)}
            className="tactics-formation-select"
            aria-label={`${teamB.name} formation`}
          >
            {FORMATION_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Start from & Board actions */}
        <div className="tactics-toolbar-actions">
          {/* Start From Select */}
          <select
            onChange={(e) => {
              if (e.target.value) {
                onSelectStartFrom(e.target.value);
                e.target.value = '';
              }
            }}
            defaultValue=""
            className="tactics-formation-select"
            style={{ color: 'var(--text-main)' }}
          >
            <option value="" disabled>
              Start from ▾
            </option>
            <option value="last-match">Last match lineup</option>
            {hasMatchLineup && <option value="this-match">This match&apos;s lineup</option>}
            <option value="auto">Auto-pick by position</option>
            <option value="empty">Empty pitch</option>
          </select>

          {/* Flip Sides */}
          <button
            type="button"
            className="tactics-btn"
            onClick={onFlip}
            title="Flip pitch view (switch top and bottom team)"
          >
            <ArrowUpDown size={15} />
            <span>Flip</span>
          </button>

          {/* Undo */}
          <button
            type="button"
            className="tactics-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo last action"
          >
            <RotateCcw size={15} />
            <span>Undo</span>
          </button>

          {/* Reset */}
          <button
            type="button"
            className="tactics-btn"
            onClick={onReset}
            title="Reset players to default formation positions"
          >
            <RotateCw size={15} />
            <span>Reset</span>
          </button>

          {/* Save Board */}
          <button
            type="button"
            className="tactics-btn"
            onClick={onSaveBoard}
            title="Save board on this device"
          >
            <Bookmark size={15} />
            <span>Save</span>
          </button>

          {/* Open Saved */}
          <button
            type="button"
            className="tactics-btn"
            onClick={onOpenSavedBoards}
            title="Open saved boards"
          >
            <FolderOpen size={15} />
            <span>Saved</span>
          </button>

          {/* Share */}
          <button
            type="button"
            className="tactics-btn"
            onClick={onShareLink}
            title="Share board link"
          >
            <Share2 size={15} />
            <span>Share</span>
          </button>

          {/* Export PNG */}
          <button
            type="button"
            className="tactics-btn tactics-btn-primary"
            onClick={onExportImage}
            title="Download high-resolution image"
          >
            <Download size={15} />
            <span>Image</span>
          </button>
        </div>
      </div>
    </div>
  );
}
