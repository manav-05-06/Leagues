import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchReplayMatches,
  fetchReplayMeta,
  fetchReplayFrames,
} from '../../analyticsApi';
import ReplayCanvas from './ReplayCanvas';
import ReplayControls from './ReplayControls';
import { Radio, Shield, Users, Info, ChevronDown } from 'lucide-react';
import './Replay.css';

export default function ReplayPage({ initialMatchId = null }) {
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState(initialMatchId);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // in seconds
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  // Overlays
  const [overlays, setOverlays] = useState({
    hull: true,
    defensiveLine: true,
    pressing: true,
    centroid: false,
    voronoi: false,
  });

  // Chunk caching
  const chunkCacheRef = useRef(new Map());
  const pendingRequestsRef = useRef(new Set());
  const [currentChunk, setCurrentChunk] = useState(null);

  // Animation frame
  const animFrameIdRef = useRef(null);
  const lastTimestampRef = useRef(null);

  // 1. Fetch available replay matches
  useEffect(() => {
    let mounted = true;
    fetchReplayMatches()
      .then((data) => {
        if (!mounted) return;
        setMatches(data || []);
        if (data && data.length > 0 && !selectedMatchId) {
          setSelectedMatchId(data[0].id);
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      });
    return () => {
      mounted = false;
    };
  }, [selectedMatchId]);

  // 2. Fetch metadata when selected match changes
  useEffect(() => {
    if (!selectedMatchId) return;
    setLoading(true);
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    chunkCacheRef.current.clear();
    pendingRequestsRef.current.clear();
    setCurrentChunk(null);

    fetchReplayMeta(selectedMatchId)
      .then((data) => {
        setMeta(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedMatchId]);

  // 3. Prefetch / fetch chunk helper
  const loadChunk = useCallback(async (matchId, chunkIndex) => {
    if (!matchId || chunkIndex < 0) return null;
    const cacheKey = `${matchId}_${chunkIndex}`;
    if (chunkCacheRef.current.has(cacheKey)) {
      return chunkCacheRef.current.get(cacheKey);
    }
    if (pendingRequestsRef.current.has(cacheKey)) {
      return null;
    }

    pendingRequestsRef.current.add(cacheKey);
    try {
      const data = await fetchReplayFrames(matchId, chunkIndex);
      chunkCacheRef.current.set(cacheKey, data);
      pendingRequestsRef.current.delete(cacheKey);
      return data;
    } catch (err) {
      pendingRequestsRef.current.delete(cacheKey);
      console.warn(`Failed to load replay chunk ${chunkIndex}:`, err);
      return null;
    }
  }, []);

  // 4. Ensure current and next chunks are loaded
  useEffect(() => {
    if (!selectedMatchId || !meta) return;

    const chunkIdx = Math.floor(currentTime / 60);
    const cacheKey = `${selectedMatchId}_${chunkIdx}`;

    if (chunkCacheRef.current.has(cacheKey)) {
      setCurrentChunk(chunkCacheRef.current.get(cacheKey));
    } else {
      loadChunk(selectedMatchId, chunkIdx).then((data) => {
        if (data) setCurrentChunk(data);
      });
    }

    // Prefetch next chunk if within 15 seconds of boundary
    const secInChunk = currentTime % 60;
    if (secInChunk >= 45 && chunkIdx + 1 < (meta.total_chunks || 999)) {
      loadChunk(selectedMatchId, chunkIdx + 1);
    }
  }, [currentTime, selectedMatchId, meta, loadChunk]);

  // 5. Playback loop using requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) {
      lastTimestampRef.current = null;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      return;
    }

    const maxDuration = meta?.total_duration_seconds || 5400;

    const tick = (now) => {
      if (lastTimestampRef.current != null) {
        const deltaSec = (now - lastTimestampRef.current) / 1000;
        setCurrentTime((prev) => {
          const next = prev + deltaSec * playbackSpeed;
          if (next >= maxDuration) {
            setIsPlaying(false);
            return maxDuration;
          }
          return next;
        });
      }
      lastTimestampRef.current = now;
      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    animFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPlaying, playbackSpeed, meta]);

  // Keyboard shortcut: Spacebar to toggle play/pause, Left/Right to skip
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTime((t) => Math.max(0, t - 10));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const max = meta?.total_duration_seconds || 5400;
        setCurrentTime((t) => Math.min(max, t + 10));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [meta]);

  // Derive active frame and shape from current chunk
  let activeFrame = null;
  let prevFrame = null;
  let subFrameProgress = 0;
  let activeShape = null;

  if (currentChunk && currentChunk.frames && currentChunk.frames.length > 0) {
    const frames = currentChunk.frames;
    const t0 = currentChunk.t0 || 0;
    const chunkLocalSec = currentTime - t0;
    const frameIndex = Math.min(
      frames.length - 1,
      Math.max(0, Math.floor(chunkLocalSec * (currentChunk.fps || 10)))
    );

    activeFrame = frames[frameIndex];
    prevFrame = frameIndex > 0 ? frames[frameIndex - 1] : activeFrame;

    if (activeFrame && prevFrame && activeFrame.t !== prevFrame.t) {
      subFrameProgress = Math.max(0, Math.min(1, (currentTime - prevFrame.t) / (activeFrame.t - prevFrame.t)));
    }

    // Find shape at this second
    if (currentChunk.shapes && currentChunk.shapes.length > 0) {
      const targetSec = Math.round(currentTime * 10) / 10;
      let closestShape = currentChunk.shapes[0];
      let minDiff = 999;
      for (const s of currentChunk.shapes) {
        const diff = Math.abs(s.second - targetSec);
        if (diff < minDiff) {
          minDiff = diff;
          closestShape = s;
        }
      }
      activeShape = closestShape;
    }
  }

  const handleToggleOverlay = (key) => {
    setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedPlayer = meta?.players?.find((p) => p.id === selectedPlayerId);

  return (
    <div className="replay-page-layout">
      {/* Header Bar: Match Selector & Score */}
      <div className="replay-header-panel">
        <div className="replay-title-wrap">
          <div className="replay-live-badge">
            <Radio size={14} className="pulse-icon" /> TACTICAL 2D REPLAY
          </div>
          <div className="match-selector-dropdown-wrap">
            <select
              value={selectedMatchId || ''}
              onChange={(e) => setSelectedMatchId(Number(e.target.value))}
              className="replay-match-select"
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.home_team?.short_name || 'Home'} vs {m.away_team?.short_name || 'Away'} ({m.home_team?.score ?? 0} - {m.away_team?.score ?? 0}) · {new Date(m.date_time).toLocaleDateString()}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="select-arrow-icon" />
          </div>
        </div>

        {meta && (
          <div className="replay-scoreboard-banner">
            <div className="replay-team-side home">
              <span
                className="team-color-swatch"
                style={{ background: meta.home_team?.jersey_color || '#1e40af' }}
              />
              <span className="team-name">{meta.home_team?.name}</span>
              <span className="team-score">{meta.home_team?.score ?? 0}</span>
            </div>
            <div className="scoreboard-divider">FT</div>
            <div className="replay-team-side away">
              <span className="team-score">{meta.away_team?.score ?? 0}</span>
              <span className="team-name">{meta.away_team?.name}</span>
              <span
                className="team-color-swatch"
                style={{ background: meta.away_team?.jersey_color || '#dc2626' }}
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="replay-loading-state">
          <div className="replay-spinner" />
          <p>Loading tactical tracking data and team shapes...</p>
        </div>
      ) : error ? (
        <div className="replay-error-state">
          <p>⚠️ Error loading tactical replay: {error}</p>
        </div>
      ) : (
        <div className="replay-main-stage">
          {/* Pitch Canvas */}
          <ReplayCanvas
            frame={activeFrame}
            prevFrame={prevFrame}
            subFrameProgress={subFrameProgress}
            shape={activeShape}
            meta={meta}
            overlays={overlays}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={setSelectedPlayerId}
          />

          {/* Timeline and Playback Controls */}
          <ReplayControls
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            currentTime={currentTime}
            totalDuration={meta?.total_duration_seconds || 5400}
            playbackSpeed={playbackSpeed}
            onChangeSpeed={setPlaybackSpeed}
            onSeek={(t) => setCurrentTime(t)}
            onSkip={(s) => {
              const max = meta?.total_duration_seconds || 5400;
              setCurrentTime((t) => Math.max(0, Math.min(max, t + s)));
            }}
            overlays={overlays}
            onToggleOverlay={handleToggleOverlay}
            events={meta?.events || []}
            period={activeFrame?.period || 1}
          />

          {/* Tactical Telemetry & Selected Player Card */}
          <div className="replay-telemetry-grid">
            {/* Home Team Shape Stats */}
            <div className="telemetry-card home-team">
              <div className="card-header">
                <Shield size={16} color={meta?.home_team?.jersey_color} />
                <span>{meta?.home_team?.short_name || 'Home'} Shape</span>
              </div>
              <div className="stats-row">
                <div className="stat-item">
                  <span className="stat-label">Length</span>
                  <span className="stat-val">{activeShape?.home?.length ?? '--'}m</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Width</span>
                  <span className="stat-val">{activeShape?.home?.width ?? '--'}m</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Def Line</span>
                  <span className="stat-val">{activeShape?.home?.defensive_line_x ?? '--'}m</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Pressing</span>
                  <span className="stat-val pressing-val">{activeShape?.home?.pressing ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Away Team Shape Stats */}
            <div className="telemetry-card away-team">
              <div className="card-header">
                <Shield size={16} color={meta?.away_team?.jersey_color} />
                <span>{meta?.away_team?.short_name || 'Away'} Shape</span>
              </div>
              <div className="stats-row">
                <div className="stat-item">
                  <span className="stat-label">Length</span>
                  <span className="stat-val">{activeShape?.away?.length ?? '--'}m</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Width</span>
                  <span className="stat-val">{activeShape?.away?.width ?? '--'}m</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Def Line</span>
                  <span className="stat-val">{activeShape?.away?.defensive_line_x ?? '--'}m</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Pressing</span>
                  <span className="stat-val pressing-val">{activeShape?.away?.pressing ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Selected Player Card or Instructions */}
            <div className="telemetry-card player-info-card">
              <div className="card-header">
                <Users size={16} />
                <span>{selectedPlayer ? 'Player Spotlight' : 'Interactive Scout'}</span>
              </div>
              {selectedPlayer ? (
                <div className="selected-player-details">
                  <div className="player-badge-line">
                    <span className="shirt-badge">#{selectedPlayer.number || '--'}</span>
                    <strong>{selectedPlayer.name}</strong>
                    <span className="role-tag">{selectedPlayer.role}</span>
                  </div>
                  <div className="player-card-sub">
                    <span>{selectedPlayer.team_id === meta?.home_team?.id ? meta?.home_team?.short_name : meta?.away_team?.short_name}</span>
                    {selectedPlayer.goal > 0 && <span className="stat-pill goal">⚽ {selectedPlayer.goal} Goal</span>}
                    {selectedPlayer.yellow_card > 0 && <span className="stat-pill card">🟨 Card</span>}
                  </div>
                </div>
              ) : (
                <div className="empty-player-hint">
                  <p>Click any player dot on the pitch to track individual positioning and tactical role.</p>
                </div>
              )}
            </div>
          </div>

          {/* Open Data Attribution Footer */}
          <div className="replay-attribution-footer">
            <Info size={14} />
            <span>
              22-player tracking data provided by <strong>SkillCorner Open Data</strong> (MIT License) · Australian A-League Men · Pitch: 105m × 68m · 10 fps
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
