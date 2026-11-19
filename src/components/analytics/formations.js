/**
 * Formation layouts mapping Opta/ESPN formationPlace (1-11) to tactical pitch coordinates.
 * Coordinates:
 * x: 0 (left touchline) to 100 (right touchline)
 * y: 0 (opponent goal) to 100 (own goal / GK)
 */

export const FORMATION_LAYOUTS = {
  '4-2-3-1': {
    1: { x: 50, y: 88, role: 'GK' },
    2: { x: 84, y: 70, role: 'RB' },
    5: { x: 62, y: 72, role: 'RCB' },
    6: { x: 38, y: 72, role: 'LCB' },
    3: { x: 16, y: 70, role: 'LB' },
    8: { x: 64, y: 54, role: 'RDM' },
    4: { x: 36, y: 54, role: 'LDM' },
    7: { x: 82, y: 35, role: 'RAM' },
    10: { x: 50, y: 35, role: 'CAM' },
    11: { x: 18, y: 35, role: 'LAM' },
    9: { x: 50, y: 16, role: 'ST' },
  },
  '4-3-3': {
    1: { x: 50, y: 88, role: 'GK' },
    2: { x: 84, y: 70, role: 'RB' },
    5: { x: 62, y: 72, role: 'RCB' },
    6: { x: 38, y: 72, role: 'LCB' },
    3: { x: 16, y: 70, role: 'LB' },
    4: { x: 50, y: 56, role: 'CDM' },
    8: { x: 68, y: 44, role: 'RCM' },
    10: { x: 32, y: 44, role: 'LCM' },
    7: { x: 82, y: 22, role: 'RW' },
    9: { x: 50, y: 16, role: 'ST' },
    11: { x: 18, y: 22, role: 'LW' },
  },
  '4-4-2': {
    1: { x: 50, y: 88, role: 'GK' },
    2: { x: 84, y: 70, role: 'RB' },
    5: { x: 62, y: 72, role: 'RCB' },
    6: { x: 38, y: 72, role: 'LCB' },
    3: { x: 16, y: 70, role: 'LB' },
    7: { x: 84, y: 48, role: 'RM' },
    8: { x: 62, y: 50, role: 'RCM' },
    4: { x: 38, y: 50, role: 'LCM' },
    11: { x: 16, y: 48, role: 'LM' },
    9: { x: 60, y: 20, role: 'RS' },
    10: { x: 40, y: 20, role: 'LS' },
  },
  '4-1-4-1': {
    1: { x: 50, y: 88, role: 'GK' },
    2: { x: 84, y: 70, role: 'RB' },
    5: { x: 62, y: 72, role: 'RCB' },
    6: { x: 38, y: 72, role: 'LCB' },
    3: { x: 16, y: 70, role: 'LB' },
    4: { x: 50, y: 58, role: 'CDM' },
    7: { x: 84, y: 38, role: 'RM' },
    8: { x: 64, y: 42, role: 'RCM' },
    10: { x: 36, y: 42, role: 'LCM' },
    11: { x: 16, y: 38, role: 'LM' },
    9: { x: 50, y: 16, role: 'ST' },
  },
  '4-4-1-1': {
    1: { x: 50, y: 88, role: 'GK' },
    2: { x: 84, y: 70, role: 'RB' },
    5: { x: 62, y: 72, role: 'RCB' },
    6: { x: 38, y: 72, role: 'LCB' },
    3: { x: 16, y: 70, role: 'LB' },
    7: { x: 84, y: 50, role: 'RM' },
    8: { x: 62, y: 52, role: 'RCM' },
    4: { x: 38, y: 52, role: 'LCM' },
    11: { x: 16, y: 50, role: 'LM' },
    10: { x: 50, y: 32, role: 'SS' },
    9: { x: 50, y: 16, role: 'ST' },
  },
  '4-3-2-1': {
    1: { x: 50, y: 88, role: 'GK' },
    2: { x: 84, y: 70, role: 'RB' },
    5: { x: 62, y: 72, role: 'RCB' },
    6: { x: 38, y: 72, role: 'LCB' },
    3: { x: 16, y: 70, role: 'LB' },
    4: { x: 50, y: 56, role: 'CM' },
    8: { x: 70, y: 54, role: 'RCM' },
    7: { x: 30, y: 54, role: 'LCM' },
    10: { x: 64, y: 34, role: 'RAM' },
    11: { x: 36, y: 34, role: 'LAM' },
    9: { x: 50, y: 16, role: 'ST' },
  },
  '4-1-2-1-2': {
    1: { x: 50, y: 88, role: 'GK' },
    2: { x: 84, y: 70, role: 'RB' },
    5: { x: 62, y: 72, role: 'RCB' },
    6: { x: 38, y: 72, role: 'LCB' },
    3: { x: 16, y: 70, role: 'LB' },
    4: { x: 50, y: 60, role: 'CDM' },
    8: { x: 72, y: 48, role: 'RCM' },
    7: { x: 28, y: 48, role: 'LCM' },
    10: { x: 50, y: 34, role: 'CAM' },
    9: { x: 60, y: 18, role: 'RS' },
    11: { x: 40, y: 18, role: 'LS' },
  },
  '3-5-2': {
    1: { x: 50, y: 88, role: 'GK' },
    5: { x: 72, y: 72, role: 'RCB' },
    6: { x: 50, y: 74, role: 'CB' },
    4: { x: 28, y: 72, role: 'LCB' },
    2: { x: 86, y: 48, role: 'RWB' },
    8: { x: 65, y: 52, role: 'RCM' },
    7: { x: 50, y: 54, role: 'CM' },
    10: { x: 35, y: 52, role: 'LCM' },
    3: { x: 14, y: 48, role: 'LWB' },
    9: { x: 60, y: 18, role: 'RS' },
    11: { x: 40, y: 18, role: 'LS' },
  },
  '3-4-3': {
    1: { x: 50, y: 88, role: 'GK' },
    5: { x: 72, y: 72, role: 'RCB' },
    6: { x: 50, y: 74, role: 'CB' },
    4: { x: 28, y: 72, role: 'LCB' },
    2: { x: 84, y: 50, role: 'RWB' },
    8: { x: 62, y: 52, role: 'RCM' },
    7: { x: 38, y: 52, role: 'LCM' },
    3: { x: 16, y: 50, role: 'LWB' },
    10: { x: 80, y: 22, role: 'RW' },
    9: { x: 50, y: 16, role: 'ST' },
    11: { x: 20, y: 22, role: 'LW' },
  },
  '3-4-2-1': {
    1: { x: 50, y: 88, role: 'GK' },
    5: { x: 72, y: 72, role: 'RCB' },
    6: { x: 50, y: 74, role: 'CB' },
    4: { x: 28, y: 72, role: 'LCB' },
    2: { x: 84, y: 50, role: 'RWB' },
    8: { x: 62, y: 54, role: 'RCM' },
    7: { x: 38, y: 54, role: 'LCM' },
    3: { x: 16, y: 50, role: 'LWB' },
    10: { x: 66, y: 34, role: 'RAM' },
    11: { x: 34, y: 34, role: 'LAM' },
    9: { x: 50, y: 16, role: 'ST' },
  },
  '5-3-2': {
    1: { x: 50, y: 88, role: 'GK' },
    2: { x: 86, y: 68, role: 'RWB' },
    4: { x: 68, y: 72, role: 'RCB' },
    5: { x: 50, y: 74, role: 'CB' },
    6: { x: 32, y: 72, role: 'LCB' },
    3: { x: 14, y: 68, role: 'LWB' },
    8: { x: 66, y: 48, role: 'RCM' },
    7: { x: 50, y: 50, role: 'CM' },
    10: { x: 34, y: 48, role: 'LCM' },
    9: { x: 60, y: 18, role: 'RS' },
    11: { x: 40, y: 18, role: 'LS' },
  },
  '5-4-1': {
    1: { x: 50, y: 88, role: 'GK' },
    2: { x: 86, y: 68, role: 'RWB' },
    4: { x: 68, y: 72, role: 'RCB' },
    5: { x: 50, y: 74, role: 'CB' },
    6: { x: 32, y: 72, role: 'LCB' },
    3: { x: 14, y: 68, role: 'LWB' },
    7: { x: 84, y: 42, role: 'RM' },
    8: { x: 62, y: 46, role: 'RCM' },
    10: { x: 38, y: 46, role: 'LCM' },
    11: { x: 16, y: 42, role: 'LM' },
    9: { x: 50, y: 16, role: 'ST' },
  },
};

/**
 * Calculates coordinates for 11 starters based on formation name and formationPlace.
 *
 * @param {string} formation - e.g. "4-2-3-1"
 * @param {Array} starters - Array of 11 starter player objects
 * @returns {Array} Starters with computed { x, y } coordinates
 */
export function getFormationCoordinates(formation, starters = []) {
  const normalizedFormation = (formation || '').replace(/\s+/g, '');
  const layout = FORMATION_LAYOUTS[normalizedFormation];

  if (layout) {
    return starters.map((p) => {
      const place = p.formation_place || p.formationPlace;
      const pos = layout[place] || { x: 50, y: 50, role: p.position_group || 'M' };
      return {
        ...p,
        x: pos.x,
        y: pos.y,
        tacticalRole: pos.role,
      };
    });
  }

  // Fallback: Group by position letter (G / D / M / F)
  const gks = starters.filter((p) => p.position_group === 'G' || p.formation_place === 1);
  const defs = starters.filter((p) => p.position_group === 'D' && p.formation_place !== 1);
  const mids = starters.filter((p) => p.position_group === 'M' && p.formation_place !== 1);
  const fwds = starters.filter((p) => p.position_group === 'F' && p.formation_place !== 1);

  const calculateRowX = (index, count) => {
    if (count <= 1) return 50;
    const padding = 16;
    const available = 100 - 2 * padding;
    return padding + (index / (count - 1)) * available;
  };

  const results = [];

  gks.forEach((p) => results.push({ ...p, x: 50, y: 88, tacticalRole: 'GK' }));
  defs.forEach((p, idx) => results.push({ ...p, x: calculateRowX(idx, defs.length), y: 70, tacticalRole: 'DEF' }));
  mids.forEach((p, idx) => results.push({ ...p, x: calculateRowX(idx, mids.length), y: 48, tacticalRole: 'MID' }));
  fwds.forEach((p, idx) => results.push({ ...p, x: calculateRowX(idx, fwds.length), y: 20, tacticalRole: 'FWD' }));

  return results;
}
