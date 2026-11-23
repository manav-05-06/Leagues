import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolveSiteUrl, isValidEspnId } from './site.js';
import { buildHead } from './meta.js';
import pageHandler from '../../api/seo/page.js';

const hasBuiltPage = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));

function createMockRes() {
  const headers = {};
  let statusCode = 200;
  let body = '';
  return {
    setHeader(k, v) { headers[k.toLowerCase()] = v; },
    status(code) { statusCode = code; return this; },
    send(content) { body = content; return this; },
    end() { return this; },
    getHeaders: () => headers,
    getStatusCode: () => statusCode,
    getBody: () => body,
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

// Minimal ESPN summary for a match; `kickoff` and state decide the status.
function summary({ id, state, completed, kickoff, leagueSlug = 'eng.1' }) {
  return {
    header: {
      id,
      league: { slug: leagueSlug, name: 'English Premier League', abbreviation: 'Premier League' },
      competitions: [{
        date: kickoff,
        status: { type: { state, completed, shortDetail: completed ? 'FT' : '' } },
        competitors: [
          { homeAway: 'home', score: '0', team: { id: '364', displayName: 'Liverpool', abbreviation: 'LIV', color: 'd11317', logos: [{ href: 'x' }] } },
          { homeAway: 'away', score: '1', team: { id: '359', displayName: 'Arsenal', abbreviation: 'ARS', color: 'e20520', logos: [{ href: 'y' }] } },
        ],
      }],
    },
    gameInfo: { venue: { fullName: 'Anfield', address: { city: 'Liverpool' } } },
    keyEvents: [],
  };
}

async function withEnv(vars, fn) {
  const saved = {};
  for (const k of Object.keys(vars)) {
    saved[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  try {
    return await fn();
  } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

async function withFetch(impl, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

test('resolveSiteUrl prefers SITE_URL, then VITE_SITE_URL, then the Vercel domain', () => {
  assert.equal(resolveSiteUrl({ SITE_URL: 'https://a.com/' }), 'https://a.com');
  assert.equal(resolveSiteUrl({ VITE_SITE_URL: 'https://b.com' }), 'https://b.com');
  assert.equal(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'c.vercel.app' }), 'https://c.vercel.app');
  assert.equal(resolveSiteUrl({ SITE_URL: 'undefined' }), 'http://localhost:3000');
  assert.equal(resolveSiteUrl({}), 'http://localhost:3000');
});

test('isValidEspnId accepts only numeric ids', () => {
  assert.equal(isValidEspnId('401879246'), true);
  assert.equal(isValidEspnId('364'), true);
  assert.equal(isValidEspnId('12&x=1'), false);
  assert.equal(isValidEspnId('../etc'), false);
  assert.equal(isValidEspnId(''), false);
  assert.equal(isValidEspnId(undefined), false);
});

test('upcoming match description never prints NaN when prediction is missing', () => {
  const page = {
    kind: 'match', id: '1', status: 'upcoming', kickoff: new Date(Date.now() + 86400000).toISOString(),
    league: { espnSlug: 'eng.1', name: 'Premier League', urlName: 'premier-league' },
    home: { id: '364', name: 'Liverpool', score: 0 }, away: { id: '359', name: 'Arsenal', score: 0 },
    venue: null, goals: [], xg: null, prediction: null,
  };
  const head = buildHead(page, 'https://example.com');
  assert.doesNotMatch(head.description, /NaN/);
});

test('page: non-numeric match and team ids return 404 without calling ESPN', { skip: !hasBuiltPage && 'run npm run build first' }, async () => {
  let called = 0;
  await withFetch(async () => { called += 1; return jsonResponse({}); }, async () => {
    for (const kind of ['match', 'team']) {
      const res = createMockRes();
      await pageHandler({ query: { kind, id: '12abc' } }, res);
      assert.equal(res.getStatusCode(), 404, kind);
      assert.match(res.getBody(), /noindex/);
    }
  });
  assert.equal(called, 0);
});

test('page: /league/eng.1 redirects to the readable address', { skip: !hasBuiltPage && 'run npm run build first' }, async () => {
  const res = createMockRes();
  await pageHandler({ query: { kind: 'league', name: 'eng.1' } }, res);
  assert.equal(res.getStatusCode(), 301);
  assert.equal(res.getHeaders().location, '/league/premier-league');

  const resTable = createMockRes();
  await pageHandler({ query: { kind: 'table', name: 'eng.1' } }, resTable);
  assert.equal(resTable.getStatusCode(), 301);
  assert.equal(resTable.getHeaders().location, '/league/premier-league/table');
});

test('page: xG from the analytics API (xg.home / xg.away) appears in the description', { skip: !hasBuiltPage && 'run npm run build first' }, async () => {
  await withEnv({ ANALYTICS_API_URL: 'https://analytics.test', SITE_URL: 'https://example.com' }, () =>
    withFetch(async (url) => {
      const u = String(url);
      if (u.includes('summary?event=900001')) {
        return jsonResponse(summary({ id: '900001', state: 'post', completed: true, kickoff: '2026-11-01T16:30Z' }));
      }
      if (u.startsWith('https://analytics.test/matches/900001/analytics')) {
        return jsonResponse({ xg: { home: 1.34, away: 0.81, timeline: [] } });
      }
      return jsonResponse({}, 404);
    }, async () => {
      const res = createMockRes();
      await pageHandler({ query: { kind: 'match', id: '900001', slug: 'liverpool-vs-arsenal' } }, res);
      assert.equal(res.getStatusCode(), 200);
      assert.match(res.getBody(), /xG: Liverpool 1\.3, Arsenal 0\.8\./);
    })
  );
});

test('page: prediction uses win_probability and shows real percentages', { skip: !hasBuiltPage && 'run npm run build first' }, async () => {
  const kickoff = new Date(Date.now() + 2 * 86400000).toISOString();
  await withEnv({ ANALYTICS_API_URL: 'https://analytics.test', SITE_URL: 'https://example.com' }, () =>
    withFetch(async (url) => {
      const u = String(url);
      if (u.includes('summary?event=900002')) {
        return jsonResponse(summary({ id: '900002', state: 'pre', completed: false, kickoff }));
      }
      if (u.startsWith('https://analytics.test/predict/prematch')) {
        return jsonResponse({ win_probability: { home: 0.48, draw: 0.26, away: 0.26 } });
      }
      return jsonResponse({}, 404);
    }, async () => {
      const res = createMockRes();
      await pageHandler({ query: { kind: 'match', id: '900002', slug: 'liverpool-vs-arsenal' } }, res);
      const body = res.getBody();
      assert.match(body, /Liverpool 48%, draw 26%, Arsenal 26%/);
      assert.doesNotMatch(body, /NaN/);
    })
  );
});

test('page: a broken prediction response is skipped, not printed as NaN', { skip: !hasBuiltPage && 'run npm run build first' }, async () => {
  const kickoff = new Date(Date.now() + 2 * 86400000).toISOString();
  await withEnv({ ANALYTICS_API_URL: 'https://analytics.test', SITE_URL: 'https://example.com' }, () =>
    withFetch(async (url) => {
      const u = String(url);
      if (u.includes('summary?event=900003')) {
        return jsonResponse(summary({ id: '900003', state: 'pre', completed: false, kickoff }));
      }
      if (u.startsWith('https://analytics.test/predict/prematch')) {
        return jsonResponse({ something_else: true });
      }
      return jsonResponse({}, 404);
    }, async () => {
      const res = createMockRes();
      await pageHandler({ query: { kind: 'match', id: '900003', slug: 'liverpool-vs-arsenal' } }, res);
      assert.doesNotMatch(res.getBody(), /NaN/);
      assert.match(res.getBody(), /Our model&#39;s win chances, the most likely scores/);
    })
  );
});

test('goal minutes keep a single quote mark', async () => {
  const { matchFromSummary } = await import('./normalize.js');
  const base = summary({ id: '1', state: 'post', completed: true, kickoff: '2026-11-01T16:30Z' });
  base.keyEvents = [
    { scoringPlay: true, shootout: false, clock: { displayValue: "16'" }, team: { id: '359' }, participants: [{ athlete: { displayName: 'Kai Havertz' } }] },
    { scoringPlay: true, shootout: false, clock: { displayValue: "90'+5'" }, team: { id: '364' }, participants: [{ athlete: { displayName: 'A' } }] },
    { scoringPlay: true, shootout: false, clock: { displayValue: '45' }, team: { id: '364' }, participants: [{ athlete: { displayName: 'B' } }] },
  ];
  const m = matchFromSummary(base);
  assert.deepEqual(m.goals.map((g) => g.minute), ["16'", "90'+5'", "45'"]);
});
