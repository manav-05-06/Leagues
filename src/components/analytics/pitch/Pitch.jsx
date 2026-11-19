/**
 * Standard 105m x 68m Football Pitch SVG.
 * Coordinate system:
 * (0, 0) is top-left, (105, 68) is bottom-right.
 * Attacking towards right (x=105).
 */
export default function Pitch({ children, className = '', showZones = false }) {
  return (
    <div className={`relative w-full aspect-[105/68] overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/90 shadow-inner select-none ${className}`}>
      <svg
        viewBox="0 0 105 68"
        className="w-full h-full text-slate-600/70"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
      >
        {/* Subtle grass mowing bands */}
        <defs>
          <pattern id="pitch-stripes" width="15" height="68" patternUnits="userSpaceOnUse">
            <rect width="7.5" height="68" fill="rgba(255,255,255,0.015)" />
            <rect x="7.5" width="7.5" height="68" fill="transparent" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="105" height="68" fill="url(#pitch-stripes)" stroke="none" />

        {/* 3x3 Zones overlay if enabled */}
        {showZones && (
          <g stroke="rgba(255,255,255,0.08)" strokeDasharray="1.5 1.5" strokeWidth="0.35">
            {/* Thirds: 35m each */}
            <line x1="35" y1="0" x2="35" y2="68" />
            <line x1="70" y1="0" x2="70" y2="68" />
            {/* Channels: 22.67m each */}
            <line x1="0" y1="22.67" x2="105" y2="22.67" />
            <line x1="0" y1="45.33" x2="105" y2="45.33" />
          </g>
        )}

        {/* Outer boundary */}
        <rect x="0.25" y="0.25" width="104.5" height="67.5" rx="0.5" />

        {/* Halfway line & Center Circle */}
        <line x1="52.5" y1="0" x2="52.5" y2="68" />
        <circle cx="52.5" cy="34" r="9.15" />
        <circle cx="52.5" cy="34" r="0.6" fill="currentColor" />

        {/* Left Penalty Area */}
        <rect x="0" y="13.84" width="16.5" height="40.32" />
        <rect x="0" y="24.84" width="5.5" height="18.32" />
        <circle cx="11" cy="34" r="0.6" fill="currentColor" />
        <path d="M 16.5 26.69 A 9.15 9.15 0 0 1 16.5 41.31" />

        {/* Right Penalty Area */}
        <rect x="88.5" y="13.84" width="16.5" height="40.32" />
        <rect x="99.5" y="24.84" width="5.5" height="18.32" />
        <circle cx="94" cy="34" r="0.6" fill="currentColor" />
        <path d="M 88.5 26.69 A 9.15 9.15 0 0 0 88.5 41.31" />

        {/* Corner Arcs */}
        <path d="M 0 1 A 1 1 0 0 0 1 0" />
        <path d="M 104 0 A 1 1 0 0 0 105 1" />
        <path d="M 0 67 A 1 1 0 0 1 1 68" />
        <path d="M 104 68 A 1 1 0 0 1 105 67" />

        {/* Goal Frames */}
        <rect x="-1.5" y="30.34" width="1.5" height="7.32" strokeWidth="0.4" stroke="currentColor" fill="none" opacity="0.6" />
        <rect x="105" y="30.34" width="1.5" height="7.32" strokeWidth="0.4" stroke="currentColor" fill="none" opacity="0.6" />

        {/* Injected Content / Events / Shots */}
        {children}
      </svg>
    </div>
  );
}
