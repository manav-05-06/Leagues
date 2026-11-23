import fs from 'node:fs';
import path from 'node:path';
import { buildHead, renderHeadTags, escapeHtml } from '../../src/seo/meta.js';
import { matchFromSummary, teamFromEspn } from '../../src/seo/normalize.js';
import { fromUrlName, LEAGUE_SEO_DATA, COVERED_LEAGUES } from '../../src/seo/leagues.js';
import { paths, slugify } from '../../src/routes.js';
import { resolveSiteUrl, isValidEspnId } from '../../src/seo/site.js';

const USER_AGENT = 'LeaguesMatchAnalytics/1.0 (Educational open analytics platform)';
const memoryCache = new Map();
let cachedIndexHtml = null;

function getCached(url) {
  const item = memoryCache.get(url);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    memoryCache.delete(url);
    return null;
  }
  return item.data;
}

function setCache(url, data, ttlMs = 60000) {
  memoryCache.set(url, { data, expiry: Date.now() + ttlMs });
}

async function fetchWithRetry(url, options = {}, timeoutMs = 3000, retries = 1) {
  const cached = getCached(url);
  if (cached) return cached;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
          ...(options.headers || {}),
        },
      });
      clearTimeout(timeout);
      if (res.status === 404) {
        return { status: 404, notFound: true };
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setCache(url, data, 60000);
      return data;
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === retries) throw err;
    }
  }
  return null;
}

// Only the BUILT page is usable: the source index.html loads /src/main.jsx,
// which doesn't exist online, so it must never be served.
function readTemplate() {
  if (cachedIndexHtml) return cachedIndexHtml;

  const distPath = path.join(process.cwd(), 'dist', 'index.html');
  if (fs.existsSync(distPath)) {
    cachedIndexHtml = fs.readFileSync(distPath, 'utf8');
    return cachedIndexHtml;
  }

  return null;
}

const SEO_SHELL_STYLE = `<style>
.seo-shell { background: #0a1c13; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; min-height: 100vh; }
.seo-shell a { color: #00ff87; text-decoration: none; }
.seo-shell nav { margin-bottom: 16px; font-size: 14px; opacity: 0.8; }
.seo-shell h1 { font-size: 28px; margin: 0 0 12px 0; font-weight: 800; }
.seo-shell p { font-size: 15px; line-height: 1.6; color: #94a3b8; margin: 0 0 12px 0; }
.seo-shell ul { padding-left: 20px; margin: 0 0 16px 0; }
.seo-shell li { margin-bottom: 6px; }
</style>`;

export default async function handler(req, res) {
  const siteUrl = resolveSiteUrl();
  const isProd = process.env.VERCEL_ENV === 'production';
  const analyticsApiUrl = process.env.ANALYTICS_API_URL || null;

  const { kind = 'home', id, slug, name, page: staticPage, season: querySeason } = req.query;

  if (!isProd) {
    res.setHeader('X-Robots-Tag', 'noindex');
  }

  let template = readTemplate();
  if (!template) {
    try {
      const fallbackRes = await fetch(`${siteUrl}/index.html`, { headers: { 'User-Agent': USER_AGENT } });
      if (fallbackRes.ok) {
        const text = await fallbackRes.text();
        // Accept only the built page (it has the markers and no /src/ script).
        if (text.includes('<!--seo-head-->') && !text.includes('/src/main.jsx')) {
          template = text;
          cachedIndexHtml = template;
        }
      }
    } catch {
      // ignore
    }
  }

  if (!template) {
    return res.status(500).send('Template unavailable');
  }

  let statusCode = 200;
  let cacheControl = 'public, s-maxage=3600, stale-while-revalidate=86400';
  let pageData = null;
  let bodyHtml = '';

  const badId = (kind === 'match' || kind === 'team') && !isValidEspnId(id);

  try {
    if (badId) {
      statusCode = 404;
      cacheControl = 'public, s-maxage=300';
      pageData = { kind: 'notfound' };
      bodyHtml = `<main class="seo-shell"><nav><a href="/">Matchday Arena</a></nav><h1>Page not found</h1><p>The page you are looking for does not exist.</p><p><a href="/">Back to home</a></p></main>`;
    } else if (kind === 'match') {
      const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${id}`;
      const summary = await fetchWithRetry(summaryUrl, {}, 3000, 1);

      if (!summary || summary.notFound) {
        statusCode = 404;
        cacheControl = 'public, s-maxage=300';
        pageData = { kind: 'notfound' };
        bodyHtml = `<main class="seo-shell"><nav><a href="/">Matchday Arena</a></nav><h1>Match not found</h1><p>The match you are looking for does not exist.</p><p><a href="/">Return to Home</a></p></main>`;
      } else {
        const parsed = matchFromSummary(summary);
        if (!parsed) {
          throw new Error('Failed to parse match summary');
        }

        // Try to fetch analytics/xg if league is covered
        if (COVERED_LEAGUES.includes(parsed.league.espnSlug) && analyticsApiUrl) {
          try {
            if (parsed.status === 'finished' || parsed.status === 'live') {
              const xgRes = await fetch(`${analyticsApiUrl}/matches/${id}/analytics`, {
                headers: { 'User-Agent': USER_AGENT },
                signal: AbortSignal.timeout(1500),
              });
              if (xgRes.ok) {
                const xgData = await xgRes.json();
                const xg = xgData?.xg;
                if (Number.isFinite(xg?.home) && Number.isFinite(xg?.away)) {
                  parsed.xg = { home: xg.home, away: xg.away };
                }
              }
            } else if (parsed.status === 'upcoming') {
              const predRes = await fetch(
                `${analyticsApiUrl}/predict/prematch?${new URLSearchParams({ league: parsed.league.espnSlug, home_id: parsed.home.id, away_id: parsed.away.id })}`,
                { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(1500) }
              );
              if (predRes.ok) {
                const predData = await predRes.json();
                const wp = predData?.win_probability;
                if (Number.isFinite(wp?.home) && Number.isFinite(wp?.draw) && Number.isFinite(wp?.away)) {
                  parsed.prediction = { home: wp.home, draw: wp.draw, away: wp.away };
                }
              }
            }
          } catch {
            // Analytics timeout/failure is gracefully skipped
          }
        }

        // Canonical redirect check
        const canonicalSlug = slugify(`${parsed.home.name} vs ${parsed.away.name}`);
        if (canonicalSlug && slug !== canonicalSlug) {
          res.setHeader('Location', paths.match(parsed));
          return res.status(301).end();
        }

        pageData = parsed;

        if (parsed.status === 'live') {
          cacheControl = 'public, s-maxage=30, stale-while-revalidate=60';
        } else if (parsed.status === 'upcoming') {
          cacheControl = 'public, s-maxage=300, stale-while-revalidate=3600';
        } else {
          cacheControl = 'public, s-maxage=3600, stale-while-revalidate=86400';
        }

        const homeSlug = slugify(parsed.home.name);
        const awaySlug = slugify(parsed.away.name);
        const statusLabel = parsed.status === 'live' ? 'Live' : parsed.status === 'finished' ? 'Full time' : 'Upcoming';
        const venueText = parsed.venue?.name ? ` · ${escapeHtml(parsed.venue.name)}` : '';
        const goalsHtml = parsed.goals.length > 0
          ? `<ul>${parsed.goals.map(g => `<li>${escapeHtml(g.player)} ${escapeHtml(g.minute)} (${escapeHtml(g.side === 'home' ? parsed.home.name : parsed.away.name)})</li>`).join('')}</ul>`
          : '';

        bodyHtml = `<main class="seo-shell">
  <nav><a href="/">Matchday Arena</a> › <a href="/league/${parsed.league.urlName}">${escapeHtml(parsed.league.name)}</a></nav>
  <h1>${escapeHtml(parsed.home.name)} ${parsed.status !== 'upcoming' && parsed.status !== 'postponed' ? `${parsed.home.score}-${parsed.away.score}` : 'vs'} ${escapeHtml(parsed.away.name)}</h1>
  <p>${statusLabel} · ${escapeHtml(parsed.league.name)}${venueText}</p>
  ${goalsHtml}
  <p><a href="/team/${parsed.home.id}/${homeSlug}">${escapeHtml(parsed.home.name)}</a> · <a href="/team/${parsed.away.id}/${awaySlug}">${escapeHtml(parsed.away.name)}</a></p>
</main>`;
      }
    } else if (kind === 'team') {
      const teamUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${id}`;
      const teamJson = await fetchWithRetry(teamUrl, {}, 3000, 1);

      if (!teamJson || teamJson.notFound) {
        statusCode = 404;
        cacheControl = 'public, s-maxage=300';
        pageData = { kind: 'notfound' };
        bodyHtml = `<main class="seo-shell"><nav><a href="/">Matchday Arena</a></nav><h1>Team not found</h1><p>The team you are looking for does not exist.</p><p><a href="/">Return to Home</a></p></main>`;
      } else {
        const teamObj = teamJson.team || teamJson;
        const defaultLeagueSlug = teamObj.defaultLeague?.slug || 'all';
        const scheduleBase = `https://site.api.espn.com/apis/site/v2/sports/soccer/${defaultLeagueSlug}/teams/${id}/schedule`;
        // Results (newest first) and upcoming fixtures come from two separate ESPN lists.
        const [resultsJson, fixturesJson] = await Promise.all([
          fetchWithRetry(scheduleBase, {}, 3000, 1).catch(() => null),
          fetchWithRetry(`${scheduleBase}?fixture=true`, {}, 3000, 1).catch(() => null),
        ]);
        const scheduleJson = {
          events: [
            ...(resultsJson?.notFound ? [] : resultsJson?.events || []),
            ...(fixturesJson?.notFound ? [] : fixturesJson?.events || []),
          ],
        };

        const parsed = teamFromEspn(teamJson, scheduleJson);
        const canonicalSlug = slugify(parsed.name);
        if (canonicalSlug && slug !== canonicalSlug) {
          res.setHeader('Location', paths.team(parsed));
          return res.status(301).end();
        }

        pageData = parsed;
        cacheControl = 'public, s-maxage=3600, stale-while-revalidate=86400';

        const teamTz = LEAGUE_SEO_DATA[parsed.defaultLeague]?.timeZone || 'UTC';
        const fmtDay = (iso) => {
          try {
            return new Intl.DateTimeFormat('en-GB', { timeZone: teamTz, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));
          } catch {
            return '';
          }
        };
        const nextHtml = parsed.nextMatch
          ? `<p><strong>Next match:</strong> ${escapeHtml(parsed.nextMatch.opponent)}${parsed.nextMatch.date ? `, ${escapeHtml(fmtDay(parsed.nextMatch.date))}` : ''}</p>`
          : '';
        const fixturesHtml = parsed.upcoming5 && parsed.upcoming5.length > 0
          ? `<h2>Upcoming fixtures</h2><ul>${parsed.upcoming5.map((e) => `<li>${escapeHtml(e.name || e.shortName || '')} · ${escapeHtml(fmtDay(e.date))}</li>`).join('')}</ul>`
          : '';
        const leagueInfo = LEAGUE_SEO_DATA[parsed.defaultLeague];
        const leagueLinkHtml = leagueInfo
          ? `<p><a href="${paths.league(parsed.defaultLeague)}">${escapeHtml(leagueInfo.name)}</a> · <a href="${paths.table(parsed.defaultLeague)}">${escapeHtml(leagueInfo.name)} table</a></p>`
          : '';
        const last5Html = parsed.last5 && parsed.last5.length > 0
          ? `<p><strong>Recent form:</strong> ${parsed.last5.map(m => `${m.outcome} (${m.score} vs ${escapeHtml(m.opponent)})`).join(', ')}</p>`
          : '';

        bodyHtml = `<main class="seo-shell">
  <nav><a href="/">Matchday Arena</a></nav>
  <h1>${escapeHtml(parsed.name)}</h1>
  <p>${escapeHtml(parsed.standingSummary || 'Football Club')}</p>
  ${nextHtml}
  ${last5Html}
  ${fixturesHtml}
  ${leagueLinkHtml}
</main>`;
      }
    } else if (kind === 'league') {
      const espnSlug = fromUrlName(name) || (LEAGUE_SEO_DATA[name] ? name : null);
      if (espnSlug && !fromUrlName(name)) {
        // /league/eng.1 → /league/premier-league (one URL per page)
        res.setHeader('Location', kind === 'table' ? paths.table(espnSlug) : paths.league(espnSlug));
        return res.status(301).end();
      }
      if (!espnSlug) {
        statusCode = 404;
        cacheControl = 'public, s-maxage=300';
        pageData = { kind: 'notfound' };
        bodyHtml = `<main class="seo-shell"><nav><a href="/">Matchday Arena</a></nav><h1>Competition not found</h1><p><a href="/">Return to Home</a></p></main>`;
      } else {
        const leagueInfo = LEAGUE_SEO_DATA[espnSlug];
        pageData = {
          kind: 'league',
          espnSlug,
          name: leagueInfo?.name,
          season: querySeason,
        };
        cacheControl = 'public, s-maxage=3600, stale-while-revalidate=86400';

        // Next matches from the current matchday (failure is tolerated).
        let matchesHtml = '';
        try {
          const board = await fetchWithRetry(
            `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnSlug}/scoreboard`,
            {},
            3000,
            1
          );
          const events = (board?.events || [])
            .filter((e) => e?.status?.type?.state !== 'post')
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 10);
          if (events.length > 0) {
            const tz = leagueInfo.timeZone || 'UTC';
            const items = events.map((e) => {
              const comps = e.competitions?.[0]?.competitors || [];
              const home = comps.find((c) => c.homeAway === 'home')?.team?.displayName || '';
              const away = comps.find((c) => c.homeAway === 'away')?.team?.displayName || '';
              let day = '';
              try {
                day = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(e.date));
              } catch {
                day = '';
              }
              const href = paths.match({ id: String(e.id), home, away });
              return `<li><a href="${href}">${escapeHtml(home)} vs ${escapeHtml(away)}</a> · ${escapeHtml(day)}</li>`;
            });
            matchesHtml = `<h2>Upcoming matches</h2><ul>${items.join('')}</ul>`;
          }
        } catch {
          matchesHtml = '';
        }

        bodyHtml = `<main class="seo-shell">
  <nav><a href="/">Matchday Arena</a></nav>
  <h1>${escapeHtml(leagueInfo.name)}</h1>
  <p>Fixtures, live scores, results and tables.</p>
  ${matchesHtml}
  <p><a href="${paths.table(espnSlug)}">${escapeHtml(leagueInfo.name)} table</a></p>
</main>`;
      }
    } else if (kind === 'table') {
      const espnSlug = fromUrlName(name) || (LEAGUE_SEO_DATA[name] ? name : null);
      if (espnSlug && !fromUrlName(name)) {
        // /league/eng.1 → /league/premier-league (one URL per page)
        res.setHeader('Location', kind === 'table' ? paths.table(espnSlug) : paths.league(espnSlug));
        return res.status(301).end();
      }
      if (!espnSlug) {
        statusCode = 404;
        cacheControl = 'public, s-maxage=300';
        pageData = { kind: 'notfound' };
        bodyHtml = `<main class="seo-shell"><nav><a href="/">Matchday Arena</a></nav><h1>Competition table not found</h1><p><a href="/">Return to Home</a></p></main>`;
      } else {
        const leagueInfo = LEAGUE_SEO_DATA[espnSlug];
        pageData = {
          kind: 'table',
          espnSlug,
          name: leagueInfo?.name,
          season: querySeason,
        };
        cacheControl = 'public, s-maxage=3600, stale-while-revalidate=86400';
        bodyHtml = `<main class="seo-shell">
  <nav><a href="/">Matchday Arena</a> › <a href="${paths.league(espnSlug)}">${escapeHtml(leagueInfo.name)}</a></nav>
  <h1>${escapeHtml(leagueInfo.name)} Table</h1>
  <p>Live standings, points, goal difference and form.</p>
</main>`;
      }
    } else if (kind === 'static') {
      pageData = { kind: 'static', page: staticPage };
      cacheControl = 'public, s-maxage=86400';

      const titles = {
        tactics: 'Football Tactics Board',
        replay: '2D Match Tracking Replay',
        about: 'About Matchday Arena',
      };
      const title = titles[staticPage] || 'Matchday Arena';

      bodyHtml = `<main class="seo-shell">
  <nav><a href="/">Matchday Arena</a></nav>
  <h1>${escapeHtml(title)}</h1>
  <p>Interactive football analytics and tactical tools.</p>
</main>`;
    } else {
      // notfound
      statusCode = 404;
      cacheControl = 'public, s-maxage=300';
      pageData = { kind: 'notfound' };
      bodyHtml = `<main class="seo-shell">
  <nav><a href="/">Matchday Arena</a></nav>
  <h1>Page Not Found</h1>
  <p>The page you are looking for does not exist or has been moved.</p>
  <p><a href="/">Back to Home</a></p>
</main>`;
    }
  } catch {
    // If anything fails unexpectedly, return the app page with home defaults
    statusCode = 200;
    cacheControl = 'no-store';
    pageData = { kind: 'home' };
    bodyHtml = '';
  }

  const head = buildHead(pageData, siteUrl);
  const headHtml = `${renderHeadTags(head)}\n${SEO_SHELL_STYLE}`;

  let filledHtml = template.replace(
    /<!--seo-head-->[\s\S]*?<!--\/seo-head-->/,
    headHtml
  );

  filledHtml = filledHtml.replace('<!--seo-body-->', bodyHtml);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  res.status(statusCode).send(filledHtml);
}
