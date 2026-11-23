/**
 * Full Pitch SVG (105m length, 68m width)
 *
 * Coordinates:
 * svgX = x * 1.05
 * svgY = (100 - y) * 0.68
 */
export default function Pitch({ children, className = '' }) {
  return (
    <div
      className={`pitch-full-stage ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '105 / 68',
        maxWidth: '560px',
        margin: '0 auto',
        overflow: 'hidden',
        borderRadius: '10px',
        border: '1px solid var(--glass-border-subtle, rgba(255, 255, 255, 0.08))',
        background: 'rgba(10, 28, 19, 0.85)',
        userSelect: 'none',
      }}
    >
      <svg
        viewBox="0 0 105 68"
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
        {/* Subtle grass bands */}
        <defs>
          <pattern id="full-pitch-stripes" width="10" height="68" patternUnits="userSpaceOnUse">
            <rect width="5" height="68" fill="rgba(255,255,255,0.015)" />
            <rect x="5" width="5" height="68" fill="transparent" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="105" height="68" fill="url(#full-pitch-stripes)" stroke="none" />

        {/* Boundary */}
        <rect x="0.25" y="0.25" width="104.5" height="67.5" rx="1" />

        {/* Halfway line & center circle */}
        <line x1="52.5" y1="0.25" x2="52.5" y2="67.75" />
        <circle cx="52.5" cy="34" r="9.15" />
        <circle cx="52.5" cy="34" r="0.6" fill="currentColor" />

        {/* Home / Left Penalty Area */}
        <rect x="0.25" y="13.84" width="16.5" height="40.32" />
        <rect x="0.25" y="24.84" width="5.5" height="18.32" />
        <circle cx="11" cy="34" r="0.6" fill="currentColor" />
        <path d="M 16.75 26.69 A 9.15 9.15 0 0 1 16.75 41.31" />

        {/* Away / Right Penalty Area */}
        <rect x="88.25" y="13.84" width="16.5" height="40.32" />
        <rect x="99.25" y="24.84" width="5.5" height="18.32" />
        <circle cx="94" cy="34" r="0.6" fill="currentColor" />
        <path d="M 88.25 26.69 A 9.15 9.15 0 0 0 88.25 41.31" />

        {/* Corner Arcs */}
        <path d="M 0 1 A 1 1 0 0 0 1 0" />
        <path d="M 0 67 A 1 1 0 0 1 1 68" />
        <path d="M 104 0 A 1 1 0 0 0 105 1" />
        <path d="M 104 68 A 1 1 0 0 1 105 67" />

        {/* Injected Content */}
        {children}
      </svg>
    </div>
  );
}
