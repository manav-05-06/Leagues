import { LEAGUE_SEO_DATA, COVERED_LEAGUES, TEAM_SITEMAP_LEAGUES } from '../../src/seo/leagues.js';
import { paths, slugify } from '../../src/routes.js';
import { isIndexable } from '../../src/seo/meta.js';
import { resolveSiteUrl } from '../../src/seo/site.js';

const USER_AGENT = 'LeaguesMatchAnalytics/1.0 (Educational open analytics platform)';

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateMonthsList(pastMonths = 18, futureMonths = 1) {
  const list = [];
  const now = new Date();
  for (let i = -pastMonths; i <= futureMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    list.push(`${yyyy}-${mm}`);
  }
  return list;
}

export default async function handler(req, res) {
  const siteUrl = resolveSiteUrl();
  const { file = 'index' } = req.query;

  let xml = '';
  let cacheHeader = 'public, s-maxage=3600, stale-while-revalidate=86400';

  try {
    if (file === 'index') {
      const months = generateMonthsList(18, 1);
      const sitemaps = [
        `${siteUrl}/sitemaps/pages.xml`,
        `${siteUrl}/sitemaps/teams.xml`,
        ...months.map((m) => `${siteUrl}/sitemaps/matches-${m}.xml`),
      ];

      xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (loc) => `  <sitemap>
    <loc>${escapeXml(loc)}</loc>
  </sitemap>`
  )
  .join('\n')}
</sitemapindex>`;
    } else if (file === 'pages.xml') {
      const urls = [
        `${siteUrl}${paths.home()}`,
        `${siteUrl}${paths.about()}`,
        `${siteUrl}${paths.tactics()}`,
        `${siteUrl}${paths.replay()}`,
      ];

      Object.keys(LEAGUE_SEO_DATA).forEach((espnSlug) => {
        urls.push(`${siteUrl}${paths.league(espnSlug)}`);
        urls.push(`${siteUrl}${paths.table(espnSlug)}`);
      });

      xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (loc) => `  <url>
    <loc>${escapeXml(loc)}</loc>
    <changefreq>daily</changefreq>
  </url>`
  )
  .join('\n')}
</urlset>`;
    } else if (file === 'teams.xml') {
      const teamUrls = [];
      const seenTeams = new Set();

      // Fetch teams from the 9 domestic leagues in parallel
      const leaguePromises = TEAM_SITEMAP_LEAGUES.map(async (slug) => {
        try {
          const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams`, {
            headers: { 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(4000),
          });
          if (!res.ok) return [];
          const data = await res.json();
          const teamsList = data?.sports?.[0]?.leagues?.[0]?.teams || [];
          return teamsList.map((t) => t.team).filter(Boolean);
        } catch {
          return [];
        }
      });

      const results = await Promise.all(leaguePromises);
      results.flat().forEach((team) => {
        if (!team.id || seenTeams.has(team.id)) return;
        seenTeams.add(team.id);
        const slug = slugify(team.displayName || team.name || '');
        const teamPath = slug ? `/team/${team.id}/${slug}` : `/team/${team.id}`;
        teamUrls.push(`${siteUrl}${teamPath}`);
      });

      xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${teamUrls
  .map(
    (loc) => `  <url>
    <loc>${escapeXml(loc)}</loc>
    <changefreq>weekly</changefreq>
  </url>`
  )
  .join('\n')}
</urlset>`;
    } else if (file.startsWith('matches-') && file.endsWith('.xml')) {
      const monthPart = file.replace(/^matches-/, '').replace(/\.xml$/, '');
      const [yyyy, mm] = monthPart.split('-');
      if (!yyyy || !mm) {
        return res.status(404).send('Invalid sitemap file');
      }

      const datesParam = `${yyyy}${mm}`;
      const isPastMonth = new Date(Number(yyyy), Number(mm), 1) < new Date();
      if (isPastMonth) {
        cacheHeader = 'public, s-maxage=86400, stale-while-revalidate=604800';
      }

      const matchEntries = [];
      const seenEventIds = new Set();

      // Fetch scoreboard for each covered league with limit=500
      const leagueScores = COVERED_LEAGUES.map(async (slug) => {
        try {
          const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${datesParam}&limit=500`;
          const res = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(5000),
          });
          if (!res.ok) return [];
          const data = await res.json();
          return (data.events || []).map((e) => ({ ...e, leagueSlug: slug }));
        } catch {
          return [];
        }
      });

      const eventsByLeague = await Promise.all(leagueScores);
      const allEvents = eventsByLeague.flat();

      allEvents.forEach((event) => {
        if (!event.id || seenEventIds.has(event.id)) return;
        seenEventIds.add(event.id);

        const comp = event.competitions?.[0] || {};
        const statusType = comp.status?.type || {};
        const isCompleted = Boolean(statusType.completed) || statusType.state === 'post';
        const isPostponed = statusType.completed === false && statusType.state === 'post';

        let status = 'upcoming';
        if (statusType.state === 'in') status = 'live';
        else if (isPostponed) status = 'postponed';
        else if (isCompleted) status = 'finished';

        const pageObj = {
          kind: 'match',
          id: event.id,
          league: { espnSlug: event.leagueSlug },
          status,
          kickoff: comp.date,
        };

        // G4 Indexability check
        if (!isIndexable(pageObj)) return;

        const homeComp = (comp.competitors || []).find((c) => c.homeAway === 'home');
        const awayComp = (comp.competitors || []).find((c) => c.homeAway === 'away');
        const homeName = homeComp?.team?.displayName || homeComp?.team?.name || 'Home';
        const awayName = awayComp?.team?.displayName || awayComp?.team?.name || 'Away';
        const slug = slugify(`${homeName} vs ${awayName}`);
        const loc = `${siteUrl}${slug ? `/match/${event.id}/${slug}` : `/match/${event.id}`}`;

        let lastmodTag = '';
        if (status === 'finished' && comp.date) {
          const kickTime = new Date(comp.date).getTime();
          const lastmod = new Date(kickTime + 3 * 3600 * 1000).toISOString();
          lastmodTag = `\n    <lastmod>${lastmod}</lastmod>`;
        }

        matchEntries.push(`  <url>
    <loc>${escapeXml(loc)}</loc>${lastmodTag}
  </url>`);
      });

      xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${matchEntries.join('\n')}
</urlset>`;
    } else {
      return res.status(404).send('Not Found');
    }

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', cacheHeader);
    res.status(200).send(xml);
  } catch (err) {
    res.status(500).send(`Sitemap generation error: ${err.message}`);
  }
}
