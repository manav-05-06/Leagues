import test from 'node:test';
import assert from 'node:assert/strict';
import robotsHandler from '../../api/seo/robots.js';
import sitemapHandler from '../../api/seo/sitemap.js';
import pageHandler from '../../api/seo/page.js';

function createMockRes() {
  const headers = {};
  let statusCode = 200;
  let body = '';
  return {
    setHeader(k, v) {
      headers[k.toLowerCase()] = v;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    send(content) {
      body = content;
      return this;
    },
    end() {
      return this;
    },
    getHeaders: () => headers,
    getStatusCode: () => statusCode,
    getBody: () => body,
  };
}

test('robotsHandler outputs valid robots.txt for production and non-production', () => {
  const originalEnv = process.env.VERCEL_ENV;
  const originalSite = process.env.SITE_URL;

  try {
    // Production
    process.env.VERCEL_ENV = 'production';
    process.env.SITE_URL = 'https://matchdayarena.com';
    const resProd = createMockRes();
    robotsHandler({}, resProd);
    assert.equal(resProd.getStatusCode(), 200);
    assert.match(resProd.getBody(), /User-agent: \*/);
    assert.match(resProd.getBody(), /Disallow: \/api\//);
    assert.match(resProd.getBody(), /Sitemap: https:\/\/matchdayarena\.com\/sitemap\.xml/);

    // Non-production
    process.env.VERCEL_ENV = 'preview';
    const resPrev = createMockRes();
    robotsHandler({}, resPrev);
    assert.equal(resPrev.getStatusCode(), 200);
    assert.match(resPrev.getBody(), /Disallow: \/\n/);
  } finally {
    if (originalEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalEnv;

    if (originalSite === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = originalSite;
  }
});

test('sitemapHandler outputs valid sitemap index and pages.xml', async () => {
  // 1. Index sitemap
  const resIndex = createMockRes();
  await sitemapHandler({ query: { file: 'index' } }, resIndex);
  assert.equal(resIndex.getStatusCode(), 200);
  assert.equal(resIndex.getHeaders()['content-type'], 'application/xml; charset=utf-8');
  assert.match(resIndex.getBody(), /<sitemapindex/);
  assert.match(resIndex.getBody(), /pages\.xml<\/loc>/);
  assert.match(resIndex.getBody(), /teams\.xml<\/loc>/);
  assert.match(resIndex.getBody(), /matches-\d{4}-\d{2}\.xml<\/loc>/);

  // 2. Pages sitemap
  const resPages = createMockRes();
  await sitemapHandler({ query: { file: 'pages.xml' } }, resPages);
  assert.equal(resPages.getStatusCode(), 200);
  assert.match(resPages.getBody(), /<urlset/);
  assert.match(resPages.getBody(), /\/league\/premier-league<\/loc>/);
  assert.match(resPages.getBody(), /\/league\/premier-league\/table<\/loc>/);
  assert.match(resPages.getBody(), /\/tactics<\/loc>/);
  assert.match(resPages.getBody(), /\/replay<\/loc>/);
  assert.match(resPages.getBody(), /\/about<\/loc>/);
});

test('pageHandler renders server-rendered HTML shell for static, league, table, and 404', async () => {
  // 1. Static tactics page
  const resTactics = createMockRes();
  await pageHandler({ query: { kind: 'static', page: 'tactics' } }, resTactics);
  assert.equal(resTactics.getStatusCode(), 200);
  assert.match(resTactics.getBody(), /<title>Football tactics board: set up both teams/);
  assert.match(resTactics.getBody(), /<main class="seo-shell">/);
  assert.match(resTactics.getBody(), /<h1>Football Tactics Board<\/h1>/);
  assert.ok(!resTactics.getBody().includes('<!--seo-body-->'));

  // 2. League page
  const resLeague = createMockRes();
  await pageHandler({ query: { kind: 'league', name: 'premier-league' } }, resLeague);
  assert.equal(resLeague.getStatusCode(), 200);
  assert.match(resLeague.getBody(), /<title>Premier League scores and fixtures/);
  assert.match(resLeague.getBody(), /<h1>Premier League<\/h1>/);

  // 3. Table page
  const resTable = createMockRes();
  await pageHandler({ query: { kind: 'table', name: 'premier-league' } }, resTable);
  assert.equal(resTable.getStatusCode(), 200);
  assert.match(resTable.getBody(), /<title>Premier League table/);
  assert.match(resTable.getBody(), /<h1>Premier League Table<\/h1>/);

  // 4. 404 Not Found
  const resNotFound = createMockRes();
  await pageHandler({ query: { kind: 'notfound' } }, resNotFound);
  assert.equal(resNotFound.getStatusCode(), 404);
  assert.match(resNotFound.getBody(), /<meta name="robots" content="noindex,follow">/);
  assert.match(resNotFound.getBody(), /<h1>Page Not Found<\/h1>/i);
});
