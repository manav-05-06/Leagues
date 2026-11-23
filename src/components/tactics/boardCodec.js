/**
 * Board Codec: Encode and decode tactics board state for shareable links.
 * Link format: /#tactics=<code>
 */

export function encode(board) {
  if (!board || !board.teams) return '';

  const compact = {
    v: 1,
    n: board.name || '',
    bt: board.bottom || 'b',
    a: {
      l: board.teams.a?.league || '',
      t: board.teams.a?.teamId || '',
      f: board.teams.a?.formation || '4-3-3',
      p: (board.teams.a?.onPitch || []).map((p) => [
        String(p.id),
        Math.round(p.x),
        Math.round(p.y),
        Number(p.slot) || 1,
      ]),
    },
    b: {
      l: board.teams.b?.league || '',
      t: board.teams.b?.teamId || '',
      f: board.teams.b?.formation || '4-3-3',
      p: (board.teams.b?.onPitch || []).map((p) => [
        String(p.id),
        Math.round(p.x),
        Math.round(p.y),
        Number(p.slot) || 1,
      ]),
    },
  };

  const json = JSON.stringify(compact);

  if (typeof globalThis !== 'undefined' && typeof globalThis.Buffer !== 'undefined') {
    return globalThis.Buffer.from(json, 'utf-8').toString('base64url');
  }

  // Browser fallback (base64url)
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decode(code) {
  if (!code || typeof code !== 'string' || code.length > 4000) return null;

  try {
    let json = '';
    if (typeof globalThis !== 'undefined' && typeof globalThis.Buffer !== 'undefined') {
      json = globalThis.Buffer.from(code, 'base64url').toString('utf-8');
    } else {
      let base64 = code.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) {
        base64 += '=';
      }
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      json = new TextDecoder().decode(bytes);
    }

    const data = JSON.parse(json);
    if (!data || data.v !== 1 || !data.a || !data.b) return null;
    if (data.bt !== 'a' && data.bt !== 'b') return null;
    if (!Array.isArray(data.a.p) || !Array.isArray(data.b.p)) return null;
    if (data.a.p.length > 11 || data.b.p.length > 11) return null;

    for (const side of ['a', 'b']) {
      for (const item of data[side].p) {
        if (!Array.isArray(item) || item.length < 4) return null;
        const [id, x, y, slot] = item;
        if (!id || typeof id !== 'string') return null;
        if (typeof x !== 'number' || isNaN(x) || x < 0 || x > 100) return null;
        if (typeof y !== 'number' || isNaN(y) || y < 0 || y > 100) return null;
        if (typeof slot !== 'number' || isNaN(slot) || slot < 1 || slot > 11) return null;
      }
    }

    return data;
  } catch {
    return null;
  }
}
