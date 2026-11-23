/**
 * GoalMouth view from shooter perspective.
 *
 * Horizontal coordinate rule:
 * normX = (55.38 - goal_y) / 10.76
 * 0.0 is left post, 1.0 is right post.
 *
 * ViewBox: 0 0 120 70
 * Left post at x = 25, Right post at x = 95 (width = 70)
 * Crossbar at y = 18, Ground at y = 58 (height = 40)
 */
export default function GoalMouth({ children, className = '' }) {
  return (
    <div
      className={`goal-mouth-stage ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '120 / 70',
        maxWidth: '440px',
        margin: '0 auto',
        overflow: 'hidden',
        borderRadius: '10px',
        border: '1px solid var(--glass-border-subtle, rgba(255, 255, 255, 0.08))',
        background: 'rgba(10, 28, 19, 0.85)',
        userSelect: 'none',
      }}
    >
      <svg
        viewBox="0 0 120 70"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          color: 'rgba(255, 255, 255, 0.25)',
        }}
        fill="none"
      >
        {/* Net pattern */}
        <defs>
          <pattern id="net-grid" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 4 4 M 4 0 L 0 4" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.3" />
          </pattern>
        </defs>

        {/* Grass / Ground */}
        <rect x="0" y="58" width="120" height="12" fill="rgba(34, 197, 94, 0.06)" />
        <line x1="0" y1="58" x2="120" y2="58" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.8" />

        {/* Net inside the goal */}
        <rect x="25" y="18" width="70" height="40" fill="url(#net-grid)" />

        {/* Goal Frame Depth */}
        <polygon points="25,18 20,24 20,58 25,58" fill="rgba(255,255,255,0.03)" />
        <polygon points="95,18 100,24 100,58 95,58" fill="rgba(255,255,255,0.03)" />
        <polygon points="25,18 20,24 100,24 95,18" fill="rgba(255,255,255,0.05)" />

        {/* White Goal Posts and Crossbar */}
        <line x1="25" y1="18" x2="25" y2="58" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="95" y1="18" x2="95" y2="58" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="24.2" y1="18" x2="95.8" y2="18" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />

        {/* Subtle post reflections */}
        <line x1="25" y1="18" x2="25" y2="58" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
        <line x1="95" y1="18" x2="95" y2="58" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
        <line x1="25" y1="18" x2="95" y2="18" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />

        {/* Labels */}
        <text x="25" y="64" fontSize="3" fill="#64748b" textAnchor="middle">Left</text>
        <text x="60" y="64" fontSize="3" fill="#64748b" textAnchor="middle">Goal Mouth</text>
        <text x="95" y="64" fontSize="3" fill="#64748b" textAnchor="middle">Right</text>

        {/* Injected shots */}
        {children}
      </svg>
    </div>
  );
}
