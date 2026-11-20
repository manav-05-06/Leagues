/**
 * Attacking Half Pitch SVG (52.5m to 105m length, 68m width).
 * Attacking goal is on the right at x=105.
 *
 * Coordinates:
 * svgX = x * 1.05
 * svgY = (100 - y) * 0.68
 */
export default function HalfPitch({ children, className = '' }) {
  return (
    <div
      className={`half-pitch-stage ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '55 / 68',
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
        viewBox="50 0 55 68"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          color: 'rgba(255, 255, 255, 0.25)',
        }}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
      >
        {/* Subtle pitch pattern */}
        <defs>
          <pattern id="half-pitch-stripes" width="10" height="68" patternUnits="userSpaceOnUse">
            <rect width="5" height="68" fill="rgba(255,255,255,0.015)" />
            <rect x="5" width="5" height="68" fill="transparent" />
          </pattern>
        </defs>
        <rect x="50" y="0" width="55" height="68" fill="url(#half-pitch-stripes)" stroke="none" />

        {/* Boundary of the attacking half */}
        <line x1="52.5" y1="0.25" x2="104.75" y2="0.25" />
        <line x1="104.75" y1="0.25" x2="104.75" y2="67.75" />
        <line x1="104.75" y1="67.75" x2="52.5" y2="67.75" />
        <line x1="52.5" y1="0.25" x2="52.5" y2="67.75" />

        {/* Center circle arc in attacking half */}
        <path d="M 52.5 24.85 A 9.15 9.15 0 0 1 52.5 43.15" />
        <circle cx="52.5" cy="34" r="0.6" fill="currentColor" />

        {/* Attacking Penalty Area */}
        <rect x="88.5" y="13.84" width="16.25" height="40.32" />
        {/* Six yard box */}
        <rect x="99.5" y="24.84" width="5.25" height="18.32" />
        {/* Penalty spot */}
        <circle cx="94" cy="34" r="0.6" fill="currentColor" />
        {/* Penalty arc */}
        <path d="M 88.5 26.69 A 9.15 9.15 0 0 0 88.5 41.31" />

        {/* Corner Arcs */}
        <path d="M 104 0 A 1 1 0 0 0 105 1" />
        <path d="M 104 68 A 1 1 0 0 1 105 67" />

        {/* Goal Frame */}
        <rect x="105" y="30.34" width="1.5" height="7.32" strokeWidth="0.4" stroke="currentColor" fill="none" opacity="0.6" />

        {/* Injected Content / Shots */}
        {children}
      </svg>
    </div>
  );
}
