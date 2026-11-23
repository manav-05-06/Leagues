import { useRef, useEffect } from 'react';
import { Delaunay } from 'd3-delaunay';

/**
 * 2D Tactical Pitch Canvas for SkillCorner tracking data.
 * Pitch dimensions: 105m x 68m, centered at (0, 0).
 */
export default function ReplayCanvas({
  frame,
  prevFrame,
  subFrameProgress = 0,
  shape,
  meta,
  overlays = {
    hull: true,
    centroid: false,
    defensiveLine: true,
    pressing: true,
    voronoi: false,
  },
  selectedPlayerId = null,
  onSelectPlayer = () => {},
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !meta) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Pitch coordinate mapping
    const pitchLength = meta.pitch_length || 105;
    const pitchWidth = meta.pitch_width || 68;
    const margin = 28;

    const availW = width - margin * 2;
    const availH = height - margin * 2;
    const scale = Math.min(availW / pitchLength, availH / pitchWidth);

    const pitchPixelW = pitchLength * scale;
    const pitchPixelH = pitchWidth * scale;
    const originX = (width - pitchPixelW) / 2;
    const originY = (height - pitchPixelH) / 2;

    const toCanvasX = (mx) => originX + (mx + pitchLength / 2) * scale;
    const toCanvasY = (my) => originY + (pitchWidth / 2 - my) * scale;
    const toCanvasDist = (d) => d * scale;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    // Draw Turf / Field background
    ctx.fillStyle = '#0f2417'; // Rich dark pitch grass
    ctx.fillRect(0, 0, width, height);

    // Pitch border with rounded corners
    ctx.save();
    ctx.fillStyle = '#112d1d';
    ctx.fillRect(originX, originY, pitchPixelW, pitchPixelH);

    // Subtle pitch mowing bands (vertical grass stripes)
    const bands = 10;
    const bandW = pitchPixelW / bands;
    for (let i = 0; i < bands; i += 2) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(originX + i * bandW, originY, bandW, pitchPixelH);
    }

    // --- PITCH MARKINGS ---
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;

    // Outer boundary
    ctx.strokeRect(originX, originY, pitchPixelW, pitchPixelH);

    // Halfway line
    const midX = originX + pitchPixelW / 2;
    ctx.beginPath();
    ctx.moveTo(midX, originY);
    ctx.lineTo(midX, originY + pitchPixelH);
    ctx.stroke();

    // Center circle (r = 9.15m)
    const midY = originY + pitchPixelH / 2;
    const centerRadius = toCanvasDist(9.15);
    ctx.beginPath();
    ctx.arc(midX, midY, centerRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Center spot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(midX, midY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Penalty Areas (16.5m deep x 40.32m wide)
    const paDepth = toCanvasDist(16.5);
    const paHalfWidth = toCanvasDist(20.16);

    // Left Penalty Box
    ctx.strokeRect(originX, midY - paHalfWidth, paDepth, paHalfWidth * 2);

    // Right Penalty Box
    ctx.strokeRect(originX + pitchPixelW - paDepth, midY - paHalfWidth, paDepth, paHalfWidth * 2);

    // Goal Areas / 6-yard boxes (5.5m deep x 18.32m wide)
    const gaDepth = toCanvasDist(5.5);
    const gaHalfWidth = toCanvasDist(9.16);
    ctx.strokeRect(originX, midY - gaHalfWidth, gaDepth, gaHalfWidth * 2);
    ctx.strokeRect(originX + pitchPixelW - gaDepth, midY - gaHalfWidth, gaDepth, gaHalfWidth * 2);

    // Penalty spots (11m from goal line)
    const penDist = toCanvasDist(11.0);
    ctx.beginPath();
    ctx.arc(originX + penDist, midY, 2, 0, Math.PI * 2);
    ctx.arc(originX + pitchPixelW - penDist, midY, 2, 0, Math.PI * 2);
    ctx.fill();

    // Penalty arcs
    ctx.beginPath();
    ctx.arc(originX + penDist, midY, centerRadius, -0.65, 0.65);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(originX + pitchPixelW - penDist, midY, centerRadius, Math.PI - 0.65, Math.PI + 0.65);
    ctx.stroke();

    // Corner arcs (1m radius)
    const cornerR = toCanvasDist(1.0);
    ctx.beginPath();
    ctx.arc(originX, originY, cornerR, 0, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(originX, originY + pitchPixelH, cornerR, -Math.PI / 2, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(originX + pitchPixelW, originY, cornerR, Math.PI / 2, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(originX + pitchPixelW, originY + pitchPixelH, cornerR, Math.PI, Math.PI * 1.5);
    ctx.stroke();

    // Goals (7.32m wide, 2m depth behind pitch line)
    const goalHalfW = toCanvasDist(3.66);
    const goalDepth = toCanvasDist(2.4);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.strokeRect(originX - goalDepth, midY - goalHalfW, goalDepth, goalHalfW * 2);
    ctx.strokeRect(originX + pitchPixelW, midY - goalHalfW, goalDepth, goalHalfW * 2);

    // Goal nets pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.8;
    for (let gy = -goalHalfW; gy <= goalHalfW; gy += toCanvasDist(0.8)) {
      ctx.beginPath();
      ctx.moveTo(originX - goalDepth, midY + gy);
      ctx.lineTo(originX, midY + gy);
      ctx.moveTo(originX + pitchPixelW, midY + gy);
      ctx.lineTo(originX + pitchPixelW + goalDepth, midY + gy);
      ctx.stroke();
    }
    ctx.restore();

    if (!frame) return;

    // Team mappings and colors
    const homeTeam = meta.home_team;
    const awayTeam = meta.away_team;
    const homeColor = homeTeam.jersey_color || '#1e40af';
    const awayColor = awayTeam.jersey_color || '#dc2626';
    const homeNumColor = homeTeam.number_color || '#ffffff';
    const awayNumColor = awayTeam.number_color || '#ffffff';

    const playerMetaMap = new Map();
    (meta.players || []).forEach((p) => {
      playerMetaMap.set(p.id, p);
    });

    // Interpolate player positions between prevFrame and current frame
    const currentPositions = new Map();
    (frame.players || []).forEach(([pid, x, y]) => {
      currentPositions.set(pid, { x, y });
    });

    const prevPositions = new Map();
    if (prevFrame && prevFrame.players) {
      prevFrame.players.forEach(([pid, x, y]) => {
        prevPositions.set(pid, { x, y });
      });
    }

    const interpolatedPlayers = [];
    currentPositions.forEach((curr, pid) => {
      let finalX = curr.x;
      let finalY = curr.y;
      if (prevPositions.has(pid)) {
        const prev = prevPositions.get(pid);
        finalX = prev.x + (curr.x - prev.x) * subFrameProgress;
        finalY = prev.y + (curr.y - prev.y) * subFrameProgress;
      }
      const pMeta = playerMetaMap.get(pid);
      const isHome = pMeta ? pMeta.team_id === homeTeam.id : false;
      interpolatedPlayers.push({
        id: pid,
        x: finalX,
        y: finalY,
        cx: toCanvasX(finalX),
        cy: toCanvasY(finalY),
        meta: pMeta,
        isHome,
      });
    });

    // --- OVERLAY: SPACE CONTROL (VORONOI) ---
    if (overlays.voronoi && interpolatedPlayers.length >= 3) {
      ctx.save();
      // Clip Voronoi to pitch boundary
      ctx.beginPath();
      ctx.rect(originX, originY, pitchPixelW, pitchPixelH);
      ctx.clip();

      const points = interpolatedPlayers.map((p) => [p.cx, p.cy]);
      const delaunay = Delaunay.from(points);
      const voronoi = delaunay.voronoi([originX, originY, originX + pitchPixelW, originY + pitchPixelH]);

      for (let i = 0; i < interpolatedPlayers.length; i++) {
        const p = interpolatedPlayers[i];
        ctx.beginPath();
        voronoi.renderCell(i, ctx);
        ctx.fillStyle = p.isHome ? hexToRgba(homeColor, 0.12) : hexToRgba(awayColor, 0.12);
        ctx.fill();
        ctx.strokeStyle = p.isHome ? hexToRgba(homeColor, 0.25) : hexToRgba(awayColor, 0.25);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    // --- OVERLAY: CONVEX HULL (TEAM OUTLINES) ---
    if (overlays.hull && shape) {
      ['home', 'away'].forEach((side) => {
        const s = shape[side];
        if (s && s.hull && s.hull.length >= 3) {
          const color = side === 'home' ? homeColor : awayColor;
          ctx.save();
          ctx.beginPath();
          s.hull.forEach(([hx, hy], idx) => {
            const px = toCanvasX(hx);
            const py = toCanvasY(hy);
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.closePath();
          ctx.fillStyle = hexToRgba(color, 0.15);
          ctx.fill();
          ctx.strokeStyle = hexToRgba(color, 0.6);
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }
      });
    }

    // --- OVERLAY: DEFENSIVE LINES ---
    if (overlays.defensiveLine && shape) {
      ['home', 'away'].forEach((side) => {
        const s = shape[side];
        if (s && typeof s.defensive_line_x === 'number') {
          const color = side === 'home' ? homeColor : awayColor;
          const lineX = toCanvasX(s.defensive_line_x);
          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.moveTo(lineX, originY);
          ctx.lineTo(lineX, originY + pitchPixelH);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.8;
          ctx.stroke();

          // Label
          ctx.fillStyle = color;
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          const labelY = side === 'home' ? originY + 14 : originY + pitchPixelH - 6;
          ctx.fillText(`${side.toUpperCase()} LINE (${s.defensive_line_x.toFixed(1)}m)`, lineX, labelY);
          ctx.restore();
        }
      });
    }

    // --- OVERLAY: CENTROIDS ---
    if (overlays.centroid && shape) {
      ['home', 'away'].forEach((side) => {
        const s = shape[side];
        if (s && s.centroid) {
          const color = side === 'home' ? homeColor : awayColor;
          const cx = toCanvasX(s.centroid[0]);
          const cy = toCanvasY(s.centroid[1]);
          ctx.save();
          ctx.fillStyle = color;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText(`${side === 'home' ? 'H' : 'A'} CM`, cx + 8, cy + 3);
          ctx.restore();
        }
      });
    }

    // --- BALL RENDERING ---
    let ballCanvas = null;
    if (frame.ball) {
      let [bx, by, bz] = frame.ball;
      if (prevFrame && prevFrame.ball) {
        bx = prevFrame.ball[0] + (bx - prevFrame.ball[0]) * subFrameProgress;
        by = prevFrame.ball[1] + (by - prevFrame.ball[1]) * subFrameProgress;
        bz = prevFrame.ball[2] + (bz - prevFrame.ball[2]) * subFrameProgress;
      }
      const bCanvasX = toCanvasX(bx);
      const bCanvasY = toCanvasY(by);
      const bHeightOffset = toCanvasDist(bz);
      ballCanvas = { x: bCanvasX, y: bCanvasY, z: bz };

      // Ball shadow on ground
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      const shadowRadius = Math.max(2, 4 - bz * 0.5);
      ctx.ellipse(bCanvasX, bCanvasY, shadowRadius * 1.4, shadowRadius * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ball sphere in air
      const ballRadius = Math.min(8, 4 + Math.max(0, bz) * 0.8);
      const ballY = bCanvasY - bHeightOffset;

      ctx.beginPath();
      ctx.arc(bCanvasX, ballY, ballRadius, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(
        bCanvasX - ballRadius * 0.3,
        ballY - ballRadius * 0.3,
        1,
        bCanvasX,
        ballY,
        ballRadius
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.7, '#fef08a');
      grad.addColorStop(1, '#eab308');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // --- PLAYER DOTS ---
    const pressingRadiusCanvas = toCanvasDist(5.0);

    interpolatedPlayers.forEach((player) => {
      const { cx, cy, meta: pMeta, isHome, id } = player;
      const isSelected = selectedPlayerId === id;
      const color = isHome ? homeColor : awayColor;
      const numColor = isHome ? homeNumColor : awayNumColor;
      const isGk = pMeta?.is_gk;

      // Pressing Aura overlay
      if (overlays.pressing && ballCanvas) {
        const distToBall = Math.hypot(cx - ballCanvas.x, cy - ballCanvas.y);
        if (distToBall <= pressingRadiusCanvas) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, 14, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(color, 0.3);
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 2]);
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.save();

      // Selected ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.strokeStyle = '#00ff87';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Player circle
      const radius = isGk ? 8.5 : 7.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Goalkeeper gold border, outfield standard border
      ctx.strokeStyle = isGk ? '#fbbf24' : '#ffffff';
      ctx.lineWidth = isGk ? 2 : 1.2;
      ctx.stroke();

      // Shirt Number or GK text
      ctx.fillStyle = numColor;
      ctx.font = 'bold 8.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = isGk ? 'GK' : (pMeta?.number != null ? `${pMeta.number}` : '');
      ctx.fillText(label, cx, cy);

      ctx.restore();
    });
  }, [frame, prevFrame, subFrameProgress, shape, meta, overlays, selectedPlayerId]);

  // Handle canvas click to select player
  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !frame || !meta) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const pitchLength = meta.pitch_length || 105;
    const pitchWidth = meta.pitch_width || 68;
    const margin = 28;
    const availW = canvas.width - margin * 2;
    const availH = canvas.height - margin * 2;
    const scale = Math.min(availW / pitchLength, availH / pitchWidth);
    const pitchPixelW = pitchLength * scale;
    const pitchPixelH = pitchWidth * scale;
    const originX = (canvas.width - pitchPixelW) / 2;
    const originY = (canvas.height - pitchPixelH) / 2;

    const toCanvasX = (mx) => originX + (mx + pitchLength / 2) * scale;
    const toCanvasY = (my) => originY + (pitchWidth / 2 - my) * scale;

    let closest = null;
    let minDist = 16; // 16px radius threshold for selection

    (frame.players || []).forEach(([pid, x, y]) => {
      const px = toCanvasX(x);
      const py = toCanvasY(y);
      const dist = Math.hypot(clickX - px, clickY - py);
      if (dist < minDist) {
        minDist = dist;
        closest = pid;
      }
    });

    onSelectPlayer(closest === selectedPlayerId ? null : closest);
  };

  return (
    <div className="replay-canvas-wrapper">
      <canvas
        ref={canvasRef}
        width={960}
        height={620}
        className="replay-canvas"
        onClick={handleClick}
      />
    </div>
  );
}

function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') return `rgba(100, 100, 100, ${alpha})`;
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return `rgba(100, 100, 100, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
