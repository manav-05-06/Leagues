/**
 * Utility functions for Pitch and GoalMouth coordinates.
 */

/**
 * Helper to compute SVG coordinates for a shot on the GoalMouth.
 *
 * @param {object} shot
 * @returns {{ x: number, y: number, onTarget: boolean }}
 */
export function getGoalMouthCoords(shot) {
  const goalY = shot.goal_y != null ? shot.goal_y : shot.end_y;
  let normX = 0.5;

  if (goalY != null) {
    normX = (55.38 - goalY) / 10.76;
  } else if (shot.y != null) {
    normX = (55.38 - shot.y) / 10.76;
  }

  // Vertical position
  let normY = 0.5;
  if (shot.height === 'top') {
    normY = 0.22;
  } else if (shot.height === 'bottom') {
    normY = 0.82;
  } else if (shot.height === 'high') {
    normY = -0.22;
  } else if (shot.outcome === 'goal') {
    normY = 0.65;
  } else {
    normY = 0.5;
  }

  // Posts: x=25 to 95 (width=70), y=18 to 58 (height=40)
  const targetX = 25 + normX * 70;
  const targetY = 18 + normY * 40;

  // Clamp within bounds with margin
  const clampedX = Math.max(6, Math.min(114, targetX));
  const clampedY = Math.max(6, Math.min(62, targetY));

  const onTarget = normX >= -0.05 && normX <= 1.05 && normY >= -0.05 && normY <= 1.05;

  return {
    x: clampedX,
    y: clampedY,
    onTarget,
  };
}
