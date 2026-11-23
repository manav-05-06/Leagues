import { useState, useMemo } from 'react';
import InfoButton from './InfoButton';
import Legend from './Legend';

const INFO_TEXT =
  'Each bar covers 5 minutes. A taller bar means more danger: shots (weighted by how good they were), corners, and free kicks near goal.';

export default function OnTopCard({
  momentum = [],
  homeName = 'Home',
  awayName = 'Away',
  colors = { home: '#00ff87', away: '#00f2fe' },
}) {
  const [activeBin, setActiveBin] = useState(null);

  // Group 1-minute momentum points into 5-minute bars (18 bins across 90 mins)
  const bins = useMemo(() => {
    if (!momentum || momentum.length === 0) return [];
    const result = [];
    for (let startMin = 0; startMin < 90; startMin += 5) {
      const endMin = startMin + 5;
      const pts = momentum.filter((m) => m.minute >= startMin && m.minute < endMin);
      let avgMomentum = 0;
      if (pts.length > 0) {
        avgMomentum = pts.reduce((acc, p) => acc + (p.momentum || 0), 0) / pts.length;
      }
      result.push({
        startMin,
        endMin,
        label: `${startMin}-${endMin}'`,
        val: avgMomentum,
        isHome: avgMomentum >= 0,
      });
    }
    return result;
  }, [momentum]);

  const maxVal = useMemo(() => {
    const vals = bins.map((b) => Math.abs(b.val));
    return Math.max(...vals, 0.4);
  }, [bins]);

  if (!bins || bins.length === 0) return null;

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <h3 className="analytics-card-title">Who was on top</h3>
        <InfoButton text={INFO_TEXT} />
      </div>

      <span className="sr-only">
        Attacking momentum wave showing which team dominated danger across 5-minute intervals.
      </span>

      {/* SVG Momentum Wave Bars */}
      <div style={{ position: 'relative', width: '100%', height: '140px', marginTop: '6px' }}>
        <svg
          viewBox="0 0 540 120"
          style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
          role="img"
          aria-label="5-minute momentum bars"
        >
          {/* Neutral Center Line (0 danger) */}
          <line
            x1="10"
            y1="60"
            x2="530"
            y2="60"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1"
            strokeDasharray="2 2"
          />

          {/* 45' Half-time vertical line */}
          <line
            x1="270"
            y1="10"
            x2="270"
            y2="110"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* 18 5-minute bars */}
          {bins.map((bin, i) => {
            const barWidth = 22;
            const barGap = 6.5;
            const x = 15 + i * (barWidth + barGap);
            const height = Math.min(48, Math.max(3, (Math.abs(bin.val) / maxVal) * 48));
            const y = bin.isHome ? 60 - height : 60;
            const barColor = bin.isHome ? colors.home : colors.away;
            const isHovered = activeBin?.label === bin.label;

            return (
              <g key={`bar-${i}`}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  rx="3"
                  fill={barColor}
                  opacity={isHovered ? 1 : 0.82}
                  style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onMouseEnter={() => setActiveBin(bin)}
                  onMouseLeave={() => setActiveBin(null)}
                  onClick={() => setActiveBin((prev) => (prev?.label === bin.label ? null : bin))}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover / Tap tooltip */}
        {activeBin && (
          <div
            style={{
              position: 'absolute',
              top: '4px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              color: '#f8fafc',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {activeBin.label}: {activeBin.isHome ? homeName : awayName} on top
          </div>
        )}
      </div>

      {/* Axis Labels 0', 45', 90' */}
      <div className="momentum-axis-labels">
        <span>0&apos;</span>
        <span>45&apos;</span>
        <span>90&apos;</span>
      </div>

      <Legend
        homeName={homeName}
        homeColor={colors.home}
        awayName={awayName}
        awayColor={colors.away}
      />
    </div>
  );
}
