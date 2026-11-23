/**
 * SVG Full Pitch component for Tactics Board.
 * Standard FIFA dimensions: 68m width x 105m length.
 * ViewBox: 0 0 68 105
 */
export default function Pitch({ children, svgRef, onPointerDown, onPointerMove, onPointerUp }) {
  return (
    <div className="tactics-pitch-container">
      <svg
        ref={svgRef}
        viewBox="0 0 68 105"
        className="tactics-pitch-svg"
        fill="none"
        stroke="rgba(255, 255, 255, 0.22)"
        strokeWidth="0.5"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Subtle grass stripes */}
        <defs>
          <pattern id="tactics-stripes" width="68" height="15" patternUnits="userSpaceOnUse">
            <rect width="68" height="7.5" fill="rgba(255, 255, 255, 0.012)" />
            <rect y="7.5" width="68" height="7.5" fill="transparent" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="68" height="105" fill="url(#tactics-stripes)" stroke="none" />

        {/* Outer pitch boundary */}
        <rect x="0.25" y="0.25" width="67.5" height="104.5" rx="0.5" strokeWidth="0.6" />

        {/* Halfway line & Centre circle */}
        <line x1="0.25" y1="52.5" x2="67.75" y2="52.5" strokeWidth="0.6" />
        <circle cx="34" cy="52.5" r="9.15" />
        <circle cx="34" cy="52.5" r="0.6" fill="currentColor" />

        {/* Top Goal & Penalty Area (Attacking down) */}
        {/* Goal mouth */}
        <rect x="30.34" y="-1.5" width="7.32" height="1.5" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.6" fill="rgba(255, 255, 255, 0.05)" />
        {/* Six yard box */}
        <rect x="24.84" y="0.25" width="18.32" height="5.5" />
        {/* Penalty box */}
        <rect x="13.84" y="0.25" width="40.32" height="16.5" />
        {/* Penalty spot */}
        <circle cx="34" cy="11" r="0.6" fill="currentColor" />
        {/* Penalty D Arc */}
        <path d="M 26.69 16.75 A 9.15 9.15 0 0 0 41.31 16.75" />

        {/* Bottom Goal & Penalty Area (Attacking up) */}
        {/* Goal mouth */}
        <rect x="30.34" y="105" width="7.32" height="1.5" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.6" fill="rgba(255, 255, 255, 0.05)" />
        {/* Six yard box */}
        <rect x="24.84" y="99.25" width="18.32" height="5.5" />
        {/* Penalty box */}
        <rect x="13.84" y="88.25" width="40.32" height="16.5" />
        {/* Penalty spot */}
        <circle cx="34" cy="94" r="0.6" fill="currentColor" />
        {/* Penalty D Arc */}
        <path d="M 26.69 88.25 A 9.15 9.15 0 0 1 41.31 88.25" />

        {/* Corner Arcs */}
        <path d="M 0.25 1 A 1 1 0 0 0 1 0.25" />
        <path d="M 67 0.25 A 1 1 0 0 0 67.75 1" />
        <path d="M 0.25 104 A 1 1 0 0 1 1 104.75" />
        <path d="M 67 104.75 A 1 1 0 0 1 67.75 104" />

        {/* Players / Dynamic Overlays */}
        {children}
      </svg>
    </div>
  );
}
