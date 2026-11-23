import test from 'node:test';
import assert from 'node:assert/strict';
import { isIndexable, buildHead, renderHeadTags, jsonLdScript } from './meta.js';
import { matchFromSummary } from './normalize.js';

test('isIndexable accurately follows all G4 rules', () => {
  // Home page
  assert.equal(isIndexable({ kind: 'home', hasDateQuery: false }), true);
  assert.equal(isIndexable({ kind: 'home', hasDateQuery: true }), false);

  // League and table
  assert.equal(isIndexable({ kind: 'league', espnSlug: 'eng.1' }), true);
  assert.equal(isIndexable({ kind: 'table', espnSlug: 'eng.1' }), true);

  // Team
  assert.equal(isIndexable({ kind: 'team', id: '364' }), true);
  assert.equal(isIndexable({ kind: 'team', id: '' }), false);

  // Statics
  assert.equal(isIndexable({ kind: 'static', page: 'tactics' }), true);
  assert.equal(isIndexable({ kind: 'static', page: 'replay' }), true);
  assert.equal(isIndexable({ kind: 'static', page: 'about' }), true);

  // NotFound
  assert.equal(isIndexable({ kind: 'notfound' }), false);

  // Match: covered league (eng.1) finished or live
  assert.equal(isIndexable({ kind: 'match', league: { espnSlug: 'eng.1' }, status: 'finished' }), true);
  assert.equal(isIndexable({ kind: 'match', league: { espnSlug: 'eng.1' }, status: 'live' }), true);

  // Match: covered upcoming within 7 days
  const now = Date.now();
  const in3Days = new Date(now + 3 * 86400 * 1000).toISOString();
  const in10Days = new Date(now + 10 * 86400 * 1000).toISOString();
  assert.equal(isIndexable({ kind: 'match', league: { espnSlug: 'eng.1' }, status: 'upcoming', kickoff: in3Days }), true);
  assert.equal(isIndexable({ kind: 'match', league: { espnSlug: 'eng.1' }, status: 'upcoming', kickoff: in10Days }), false);

  // Match: postponed or cancelled
  assert.equal(isIndexable({ kind: 'match', league: { espnSlug: 'eng.1' }, status: 'postponed' }), false);

  // Match: uncovered competition (e.g. ksa.1 or eng.fa)
  assert.equal(isIndexable({ kind: 'match', league: { espnSlug: 'ksa.1' }, status: 'finished' }), false);
});

test('buildHead creates correct titles, canonicals, descriptions and escapes for G5', () => {
  const baseMatch = {
    kind: 'match',
    id: '401879246',
    league: { espnSlug: 'eng.1', name: 'Premier League', urlName: 'premier-league' },
    status: 'finished',
    kickoff: '2026-11-01T16:30:00Z',
    venue: { name: 'Anfield', city: 'Liverpool' },
    home: { id: '364', name: 'Liverpool', score: 0 },
    away: { id: '359', name: 'Arsenal', score: 1 },
    goals: [{ player: 'Kai Havertz', minute: "16'", side: 'away' }],
  };

  // Finished win
  const headWin = buildHead(baseMatch, 'https://matchdayarena.com');
  assert.equal(headWin.title, 'Liverpool 0-1 Arsenal: xG, shot map and stats | Matchday Arena');
  assert.match(headWin.description, /Arsenal won 1-0 at Anfield on 1 Nov 2026/);
  assert.match(headWin.description, /Kai Havertz 16'/);
  assert.equal(headWin.canonical, 'https://matchdayarena.com/match/401879246/liverpool-vs-arsenal');

  // Finished draw
  const drawMatch = {
    ...baseMatch,
    home: { id: '364', name: 'Liverpool', score: 2 },
    away: { id: '359', name: 'Arsenal', score: 2 },
  };
  const headDraw = buildHead(drawMatch, 'https://matchdayarena.com');
  assert.equal(headDraw.title, 'Liverpool and Arsenal drew 2-2: xG, shot map and stats | Matchday Arena');
  assert.match(headDraw.description, /Liverpool and Arsenal drew 2-2 at Anfield on 1 Nov 2026/);

  // Live match
  const liveMatch = { ...baseMatch, status: 'live', minute: "67'" };
  const headLive = buildHead(liveMatch, 'https://matchdayarena.com');
  assert.equal(headLive.title, 'LIVE: Liverpool 0-1 Arsenal (67\') | Matchday Arena');

  // Upcoming covered match
  const upcomingMatch = {
    ...baseMatch,
    status: 'upcoming',
    prediction: { home: 0.48, draw: 0.26, away: 0.26 },
  };
  const headUpcoming = buildHead(upcomingMatch, 'https://matchdayarena.com');
  assert.equal(headUpcoming.title, 'Liverpool vs Arsenal: prediction, kick-off and line-ups | Matchday Arena');
  assert.match(headUpcoming.description, /Liverpool 48%, draw 26%, Arsenal 26%/);

  // Postponed match
  const postponedMatch = { ...baseMatch, status: 'postponed' };
  const headPostponed = buildHead(postponedMatch, 'https://matchdayarena.com');
  assert.equal(headPostponed.title, 'Liverpool vs Arsenal (Postponed) | Matchday Arena');
  assert.match(headPostponed.description, /has been postponed/);

  // Security: team name containing <script> is escaped
  const xssMatch = {
    ...baseMatch,
    home: { id: '1', name: '<script>alert(1)</script>', score: 0 },
  };
  const headXss = buildHead(xssMatch);
  const rendered = renderHeadTags(headXss);
  assert.ok(!rendered.includes('<script>alert(1)</script>'));
  assert.ok(rendered.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));

  // JSON-LD containing </script> is escaped
  const jsonLdEscaped = jsonLdScript({ text: '</script><script>hack</script>' });
  assert.ok(!jsonLdEscaped.includes('</script>'));
  assert.ok(jsonLdEscaped.includes('\\u003c/script>'));

  // Canonical never contains a query string
  assert.ok(!headWin.canonical.includes('?'));
});

test('matchFromSummary accurately normalizes ESPN summary', () => {
  const mockSummary = {
    header: {
      id: '401879246',
      league: { slug: 'eng.1', abbreviation: 'Premier League' },
      competitions: [
        {
          date: '2026-11-01T16:30Z',
          status: { type: { state: 'post', completed: true } },
          competitors: [
            { homeAway: 'home', score: '0', team: { id: '364', displayName: 'Liverpool', color: 'd11317' } },
            { homeAway: 'away', score: '1', team: { id: '359', displayName: 'Arsenal', color: 'e20520' } },
          ],
        },
      ],
    },
    gameInfo: {
      venue: { fullName: 'Anfield', address: { city: 'Liverpool' } },
    },
    keyEvents: [
      {
        scoringPlay: true,
        shootout: false,
        clock: { displayValue: '16' },
        team: { id: '359' },
        participants: [{ athlete: { displayName: 'Kai Havertz' } }],
      },
    ],
  };

  const parsed = matchFromSummary(mockSummary);
  assert.equal(parsed.kind, 'match');
  assert.equal(parsed.id, '401879246');
  assert.equal(parsed.status, 'finished');
  assert.equal(parsed.home.name, 'Liverpool');
  assert.equal(parsed.home.score, 0);
  assert.equal(parsed.away.name, 'Arsenal');
  assert.equal(parsed.away.score, 1);
  assert.equal(parsed.goals.length, 1);
  assert.equal(parsed.goals[0].player, 'Kai Havertz');
  assert.equal(parsed.goals[0].minute, "16'");
  assert.equal(parsed.goals[0].side, 'away');
});
