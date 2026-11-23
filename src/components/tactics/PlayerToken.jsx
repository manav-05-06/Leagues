import { textOn } from '../../utils/teamColors';

/**
 * Player token rendered on the SVG pitch.
 * Coordinates are in metres (0-68 x 0-105).
 */
export default function PlayerToken({
  player,
  side,
  teamName,
  color = '#00ff87',
  isSelected = false,
  isDragging = false,
  onPointerDown,
  onKeyDown,
}) {
  const svgX = (player.x / 100) * 68;
  const svgY = (player.y / 100) * 105;

  const textColor = textOn(color);
  const isGK = player.pos === 'G' || player.slot === 1;

  // Jersey text or fallback initials
  let label = player.jersey;
  if (!label) {
    const parts = (player.name || '').trim().split(/\s+/);
    label = parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : (player.name || '•').slice(0, 2).toUpperCase();
  }

  const roleText = isGK ? 'goalkeeper' : `slot ${player.slot}`;
  const ariaLabel = `${player.name || 'Player'}, ${player.jersey ? `number ${player.jersey}, ` : ''}${teamName || ''}, ${roleText}`;

  return (
    <g
      className={`player-token-group ${isDragging ? 'dragging' : ''}`}
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
      onPointerDown={(e) => onPointerDown && onPointerDown(e, player, side)}
      onKeyDown={(e) => onKeyDown && onKeyDown(e, player, side)}
      style={{
        transformOrigin: `${svgX}px ${svgY}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Invisible expanded tap target */}
      <circle
        cx={svgX}
        cy={svgY}
        r={4.5}
        fill="transparent"
        stroke="none"
      />

      {/* Selected / Dragging Accent Ring */}
      {(isSelected || isDragging) && (
        <circle
          cx={svgX}
          cy={svgY}
          r={3.4}
          fill="none"
          stroke="var(--accent-primary, #00ff87)"
          strokeWidth={0.8}
        />
      )}

      {/* Token Body Circle */}
      <circle
        cx={svgX}
        cy={svgY}
        r={2.6}
        fill={color}
        stroke={isGK ? '#ffffff' : 'rgba(0, 0, 0, 0.4)'}
        strokeWidth={isGK ? 0.7 : 0.4}
      />

      {/* Shirt Number / Initials */}
      <text
        x={svgX}
        y={svgY + 0.9}
        textAnchor="middle"
        fontSize="2.4"
        fontWeight="800"
        fontFamily="var(--font-sans, sans-serif)"
        fill={textColor}
        pointerEvents="none"
      >
        {label}
      </text>

      {/* Short Name Label */}
      <text
        x={svgX}
        y={svgY + 4.2}
        className="player-token-label"
      >
        {player.shortName || player.name?.split(' ').pop()}
      </text>
    </g>
  );
}
