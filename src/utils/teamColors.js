/**
 * Team colors contrast resolver, clash prevention, and text contrast.
 * Implements WCAG 2.1 contrast ratio against the pitch-card background (#08170f)
 * and ensures home/away visual distinction (Euclidean RGB distance >= 120).
 */

const BG_HEX = '#08170f';
export const DRAW_COLOR = '#64748b';

export function parseHex(hex) {
  if (!hex || typeof hex !== 'string') return [0, 255, 135];
  let clean = hex.replace(/^#/, '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) return [0, 255, 135];
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return [0, 255, 135];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function rgbToHex([r, g, b]) {
  const toHex = (n) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function relativeLuminance([r, g, b]) {
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

export function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

/**
 * Mixes color toward white in 10% steps until its contrast against #08170f is at least 3:1.
 * Max 10 steps.
 */
export function visible(colorHex) {
  if (!colorHex) return '#00ff87';
  let clean = colorHex.startsWith('#') ? colorHex : `#${colorHex}`;
  let rgb = parseHex(clean);
  const bgRgb = parseHex(BG_HEX);

  let step = 0;
  while (contrastRatio(rgb, bgRgb) < 3.0 && step < 10) {
    rgb = rgb.map((c) => Math.round(c + (255 - c) * 0.1));
    step += 1;
  }
  return rgbToHex(rgb);
}

/**
 * Euclidean distance between two colors in RGB space (0 - 441).
 */
export function distance(colorA, colorB) {
  const rgbA = parseHex(colorA);
  const rgbB = parseHex(colorB);
  return Math.sqrt(
    Math.pow(rgbA[0] - rgbB[0], 2) +
    Math.pow(rgbA[1] - rgbB[1], 2) +
    Math.pow(rgbA[2] - rgbB[2], 2)
  );
}

/**
 * Returns '#000000' or '#ffffff', whichever has higher contrast against color.
 * Used for text and shirt numbers.
 */
export function textOn(color) {
  const rgb = parseHex(color);
  const contrastWithWhite = contrastRatio(rgb, [255, 255, 255]);
  const contrastWithBlack = contrastRatio(rgb, [0, 0, 0]);
  return contrastWithWhite >= contrastWithBlack ? '#ffffff' : '#000000';
}

/**
 * Resolves home and away team colors with clash prevention.
 * Accepts either team objects or raw hex strings.
 *
 * @param {object|string} homeTeam - { color, alt_color, altColor } or hex
 * @param {object|string} awayTeam - { color, alt_color, altColor } or hex
 * @param {string} [altAwayColor] - Optional fallback if awayTeam is a string
 * @returns {{ home: string, away: string, draw: string }}
 */
export function resolveTeamColors(homeTeam = {}, awayTeam = {}, altAwayColor = null) {
  const rawHomeColor = typeof homeTeam === 'string' ? homeTeam : (homeTeam?.color || '#00ff87');
  const rawAwayColor = typeof awayTeam === 'string' ? awayTeam : (awayTeam?.color || '#00f2fe');
  const rawAwayAlt = typeof awayTeam === 'string' ? altAwayColor : (awayTeam?.alt_color || awayTeam?.altColor || altAwayColor);

  let home = visible(rawHomeColor);
  let away = visible(rawAwayColor);

  if (distance(home, away) < 120 && rawAwayAlt) {
    away = visible(rawAwayAlt);
  }

  if (distance(home, away) < 120) {
    away = '#e2e8f0';
  }

  if (distance(home, away) < 120) {
    away = '#00f2fe';
  }

  return {
    home,
    away,
    draw: DRAW_COLOR,
  };
}

export const getTeamColors = resolveTeamColors;

/**
 * Normalizes probabilities (0-1) to whole percentage numbers summing to exactly 100.
 */
export function normalizePercentages(h = 0, d = 0, a = 0) {
  let ph = Math.round(h * 100);
  let pd = Math.round(d * 100);
  let pa = Math.round(a * 100);
  const diff = 100 - (ph + pd + pa);
  if (diff !== 0) {
    if (ph >= pd && ph >= pa) ph += diff;
    else if (pa >= pd && pa >= ph) pa += diff;
    else pd += diff;
  }
  return [ph, pd, pa];
}
