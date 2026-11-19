import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Layers,
  Compass,
  Flame,
  Grid,
  Maximize2
} from 'lucide-react';

export default function ReplayControls({
  isPlaying,
  onTogglePlay,
  currentTime,
  totalDuration,
  playbackSpeed,
  onChangeSpeed,
  onSeek,
  onSkip,
  overlays,
  onToggleOverlay,
  events = [],
  period = 1,
}) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSliderChange = (e) => {
    onSeek(parseFloat(e.target.value));
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="replay-controls-container">
      {/* Timeline Scrubbing Track with Event Markers */}
      <div className="replay-timeline-bar">
        <div className="timeline-time-badge period-indicator">
          P{period} · {formatTime(currentTime)}
        </div>

        <div className="timeline-slider-wrapper">
          <input
            type="range"
            min="0"
            max={totalDuration || 5400}
            step="0.1"
            value={currentTime}
            onChange={handleSliderChange}
            className="replay-scrubber"
            aria-label="Replay match timeline scrubber"
          />
          <div
            className="replay-slider-fill"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Goal & Key Event Markers along timeline */}
          {events.map((ev, idx) => {
            const evSec = (ev.minute || 0) * 60 + (ev.second || 0);
            const posPercent = totalDuration > 0 ? (evSec / totalDuration) * 100 : 0;
            if (posPercent < 0 || posPercent > 100) return null;

            const isGoal = ev.type === 'goal';
            return (
              <button
                key={idx}
                className={`timeline-event-marker ${isGoal ? 'goal-marker' : 'shot-marker'}`}
                style={{ left: `${posPercent}%` }}
                onClick={() => onSeek(Math.max(0, evSec - 5))}
                title={`${ev.minute}' ${isGoal ? '⚽ GOAL' : '🎯 Shot'}: ${ev.player_name || ''} (${ev.team_name || ''})`}
              >
                <span>{isGoal ? '⚽' : '🎯'}</span>
              </button>
            );
          })}
        </div>

        <div className="timeline-time-badge total-time">
          {formatTime(totalDuration)}
        </div>
      </div>

      {/* Control Buttons & Speed Selectors */}
      <div className="replay-actions-row">
        <div className="playback-buttons-group">
          <button
            className="replay-btn skip-btn"
            onClick={() => onSkip(-10)}
            title="Rewind 10 seconds (←)"
          >
            <RotateCcw size={16} /> 10s
          </button>

          <button
            className={`replay-btn play-pause-btn ${isPlaying ? 'playing' : ''}`}
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
          </button>

          <button
            className="replay-btn skip-btn"
            onClick={() => onSkip(10)}
            title="Forward 10 seconds (→)"
          >
            10s <RotateCw size={16} />
          </button>

          {/* Speed Selector */}
          <div className="speed-pill-group">
            {[0.5, 1, 2, 4].map((spd) => (
              <button
                key={spd}
                className={`speed-pill ${playbackSpeed === spd ? 'active' : ''}`}
                onClick={() => onChangeSpeed(spd)}
              >
                {spd}×
              </button>
            ))}
          </div>
        </div>

        {/* Tactical Overlays Toggles */}
        <div className="overlay-toggles-group">
          <button
            className={`overlay-toggle-btn ${overlays.hull ? 'active' : ''}`}
            onClick={() => onToggleOverlay('hull')}
            title="Toggle team shape convex hull outline"
          >
            <Layers size={15} /> Hull
          </button>

          <button
            className={`overlay-toggle-btn ${overlays.defensiveLine ? 'active' : ''}`}
            onClick={() => onToggleOverlay('defensiveLine')}
            title="Toggle team defensive line height"
          >
            <Maximize2 size={15} /> Def Line
          </button>

          <button
            className={`overlay-toggle-btn ${overlays.pressing ? 'active' : ''}`}
            onClick={() => onToggleOverlay('pressing')}
            title="Toggle pressing player auras (within 5m of ball)"
          >
            <Flame size={15} /> Pressing
          </button>

          <button
            className={`overlay-toggle-btn ${overlays.centroid ? 'active' : ''}`}
            onClick={() => onToggleOverlay('centroid')}
            title="Toggle team center of mass"
          >
            <Compass size={15} /> Centroid
          </button>

          <button
            className={`overlay-toggle-btn ${overlays.voronoi ? 'active' : ''}`}
            onClick={() => onToggleOverlay('voronoi')}
            title="Toggle Voronoi pitch space control"
          >
            <Grid size={15} /> Pitch Control
          </button>
        </div>
      </div>
    </div>
  );
}
