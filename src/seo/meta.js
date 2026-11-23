import { COVERED_LEAGUES, LEAGUE_SEO_DATA, toUrlName } from './leagues.js';
import { paths } from '../routes.js';
import { resolveSiteUrl } from './site.js';

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function jsonLdScript(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

export function isIndexable(page) {
  if (!page) return false;

  // Non-production deployment override
  if (
    typeof globalThis.process !== 'undefined' &&
    globalThis.process.env?.VERCEL_ENV &&
    globalThis.process.env.VERCEL_ENV !== 'production'
  ) {
    return false;
  }

  if (page.kind === 'notfound') return false;

  if (page.kind === 'home') {
    return !page.hasDateQuery;
  }

  if (page.kind === 'league' || page.kind === 'table') {
    return true;
  }

  if (page.kind === 'team') {
    return Boolean(page.id);
  }

  if (page.kind === 'static') {
    return ['tactics', 'replay', 'about'].includes(page.page);
  }

  if (page.kind === 'match') {
    const isCovered = COVERED_LEAGUES.includes(page.league?.espnSlug);
    if (!isCovered) return false;

    if (page.status === 'postponed' || page.status === 'cancelled') {
      return false;
    }

    if (page.status === 'finished' || page.status === 'live') {
      return true;
    }

    if (page.status === 'upcoming') {
      if (!page.kickoff) return false;
      const kickTime = new Date(page.kickoff).getTime();
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      return kickTime >= now - 2 * 60 * 60 * 1000 && kickTime <= now + sevenDays;
    }

    return false;
  }

  return false;
}

function formatDate(isoStr, timeZone = 'UTC', options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat('en-GB', { timeZone, ...options }).format(d);
  } catch {
    return '';
  }
}

function getSeasonLabel(seasonInput, espnSlug) {
  if (espnSlug === 'usa.1') {
    return seasonInput ? String(seasonInput) : String(new Date().getFullYear());
  }
  const year = seasonInput ? parseInt(seasonInput, 10) : (new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1);
  return `${year}-${String(year + 1).slice(2)}`;
}

export function buildHead(page, siteUrl = resolveSiteUrl()) {
  const base = siteUrl.replace(/\/+$/, '');
  const brand = 'Matchday Arena';

  let title = `${brand}: live football scores, xG and match analytics`;
  let ogTitle = `${brand}: live football scores, xG and match analytics`;
  let description = 'Live scores, fixtures and tables for 19 competitions, plus xG, win chances and shot maps for the Premier League, La Liga, Serie A, Bundesliga, Ligue 1 and the Champions League.';
  let canonicalPath = '/';
  let imagePath = `${base}/og/site/default.png`;
  let imageAlt = brand;
  const jsonLd = [];

  const indexable = isIndexable(page);
  const robots = indexable
    ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
    : 'noindex,follow';

  if (!page || page.kind === 'home') {
    canonicalPath = '/';
    imagePath = `${base}/og/site/default.png`;
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: brand,
      url: `${base}/`,
    });
  } else if (page.kind === 'match') {
    const { id, home, away, league, status, kickoff, venue, goals, xg, prediction, minute } = page;
    const isCovered = COVERED_LEAGUES.includes(league?.espnSlug);
    canonicalPath = paths.match(page);

    const version = `${status}-${home?.score ?? 0}-${away?.score ?? 0}`;
    imagePath = `${base}/og/match/${id}.png?v=${version}`;
    imageAlt = `${home.name} vs ${away.name}, ${league.name}`;

    const timeZone = league.timeZone || LEAGUE_SEO_DATA[league.espnSlug]?.timeZone || 'UTC';
    const matchDate = formatDate(kickoff, timeZone);
    const weekdayDate = formatDate(kickoff, timeZone, { weekday: 'short', day: 'numeric', month: 'short' });

    // Scorers summary string
    const scorerParts = [];
    (goals || []).forEach((g) => {
      scorerParts.push(`${g.player} ${g.minute}`);
    });
    const scorersText = scorerParts.length > 0 ? ` (${scorerParts.slice(0, 3).join(', ')})` : '';

    if (status === 'finished') {
      const hScore = home.score;
      const aScore = away.score;
      const isDraw = hScore === aScore;
      const venueText = venue?.name ? ` at ${venue.name}` : '';

      if (isCovered) {
        if (isDraw) {
          ogTitle = `${home.name} and ${away.name} drew ${hScore}-${aScore}: xG, shot map and stats`;
          description = `${home.name} and ${away.name} drew ${hScore}-${aScore}${venueText} on ${matchDate}${scorersText}.`;
        } else {
          const winner = hScore > aScore ? home.name : away.name;
          const wScore = Math.max(hScore, aScore);
          const lScore = Math.min(hScore, aScore);
          ogTitle = `${home.name} ${hScore}-${aScore} ${away.name}: xG, shot map and stats`;
          description = `${winner} won ${wScore}-${lScore}${venueText} on ${matchDate}${scorersText}.`;
        }
        if (xg?.home != null && xg?.away != null) {
          description += ` xG: ${home.name} ${xg.home.toFixed(1)}, ${away.name} ${xg.away.toFixed(1)}.`;
        }
        description += " See both teams' chances (xG), the shot map and how the win chances changed minute by minute.";
      } else {
        ogTitle = `${home.name} ${hScore}-${aScore} ${away.name}: goals and stats`;
        const resText = isDraw ? `${home.name} and ${away.name} drew ${hScore}-${aScore}` : `${hScore > aScore ? home.name : away.name} won ${Math.max(hScore, aScore)}-${Math.min(hScore, aScore)}`;
        description = `${league.name}, ${matchDate}. ${resText}${scorersText}. Line-ups, key events and match stats.`;
      }
      title = `${ogTitle} | ${brand}`;
    } else if (status === 'live') {
      ogTitle = `LIVE: ${home.name} ${home.score}-${away.score} ${away.name} (${minute || "Live"})`;
      title = `${ogTitle} | ${brand}`;
      description = `Live score, goals and match stats${isCovered ? ', plus live win chances' : ''}.`;
    } else if (status === 'upcoming') {
      const venueText = venue?.name ? ` at ${venue.name}` : '';
      if (isCovered) {
        ogTitle = `${home.name} vs ${away.name}: prediction, kick-off and line-ups`;
        description = `${league.name}, ${weekdayDate}${venueText}. Our model's win chances`;
        if (prediction) {
          description += `: ${home.name} ${Math.round(prediction.home * 100)}%, draw ${Math.round(prediction.draw * 100)}%, ${away.name} ${Math.round(prediction.away * 100)}%`;
        }
        description += ', the most likely scores, and both teams\' recent form.';
      } else {
        ogTitle = `${home.name} vs ${away.name}: kick-off and line-ups`;
        description = `${league.name}, ${weekdayDate}${venueText}. Line-ups appear about an hour before kick-off.`;
      }
      title = `${ogTitle} | ${brand}`;
    } else if (status === 'postponed' || status === 'cancelled') {
      ogTitle = `${home.name} vs ${away.name} (Postponed)`;
      title = `${ogTitle} | ${brand}`;
      description = `${league.name} match between ${home.name} and ${away.name}${venue?.name ? ` at ${venue.name}` : ''} has been postponed.`;
    }

    // JSON-LD SportsEvent & Breadcrumbs
    const eventStatus = status === 'postponed'
      ? 'https://schema.org/EventPostponed'
      : status === 'cancelled'
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled';

    const sportsEvent = {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: `${home.name} vs ${away.name}`,
      sport: 'Soccer',
      startDate: kickoff,
      eventStatus,
      homeTeam: {
        '@type': 'SportsTeam',
        name: home.name,
        url: `${base}${paths.team(home)}`,
        logo: home.logo,
      },
      awayTeam: {
        '@type': 'SportsTeam',
        name: away.name,
        url: `${base}${paths.team(away)}`,
        logo: away.logo,
      },
      image: imagePath,
      url: `${base}${canonicalPath}`,
    };

    if (venue?.name) {
      sportsEvent.location = {
        '@type': 'Place',
        name: venue.name,
        address: venue.city ? { '@type': 'PostalAddress', addressLocality: venue.city } : undefined,
      };
    }

    const breadcrumbs = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
        { '@type': 'ListItem', position: 2, name: league.name, item: `${base}${paths.league(league.espnSlug)}` },
        { '@type': 'ListItem', position: 3, name: `${home.name} vs ${away.name}`, item: `${base}${canonicalPath}` },
      ],
    };

    jsonLd.push(sportsEvent, breadcrumbs);
  } else if (page.kind === 'team') {
    const { id, name, logo, standingSummary, nextMatch, last5 } = page;
    canonicalPath = paths.team(page);
    ogTitle = `${name}: fixtures, results and squad`;
    title = `${ogTitle} | ${brand}`;

    let descParts = [];
    if (standingSummary) descParts.push(standingSummary);
    if (nextMatch) {
      const nextDate = formatDate(nextMatch.date);
      descParts.push(`Next: ${nextMatch.opponent}${nextDate ? ` on ${nextDate}` : ''}`);
    }
    if (last5 && last5.length > 0) {
      descParts.push(`Last five: ${last5.map((m) => m.outcome).join(' ')}`);
    }
    descParts.push('Full fixtures, results and squad.');
    description = descParts.join('. ');

    imagePath = `${base}/og/team/${id}.png`;
    imageAlt = `${name} profile`;

    jsonLd.push(
      {
        '@context': 'https://schema.org',
        '@type': 'SportsTeam',
        name,
        sport: 'Soccer',
        logo,
        url: `${base}${canonicalPath}`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
          { '@type': 'ListItem', position: 2, name, item: `${base}${canonicalPath}` },
        ],
      }
    );
  } else if (page.kind === 'league') {
    const slug = page.espnSlug;
    const leagueName = page.name || LEAGUE_SEO_DATA[slug]?.name || 'League';
    const season = getSeasonLabel(page.season, slug);
    const isCovered = COVERED_LEAGUES.includes(slug);

    canonicalPath = paths.league(slug);
    ogTitle = `${leagueName} scores and fixtures ${season}`;
    title = `${ogTitle} | ${brand}`;
    description = `All ${leagueName} ${season} fixtures and results, with live scores during matches${isCovered ? ' and xG for every game' : ''}.`;
    imagePath = `${base}/og/league/${toUrlName(slug)}.png`;
    imageAlt = `${leagueName} fixtures`;

    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
        { '@type': 'ListItem', position: 2, name: leagueName, item: `${base}${canonicalPath}` },
      ],
    });
  } else if (page.kind === 'table') {
    const slug = page.espnSlug;
    const leagueName = page.name || LEAGUE_SEO_DATA[slug]?.name || 'League';
    const season = getSeasonLabel(page.season, slug);

    canonicalPath = paths.table(slug);
    ogTitle = `${leagueName} table ${season}`;
    title = `${ogTitle} | ${brand}`;
    description = `Live ${leagueName} ${season} standings: points, goal difference and form, updated during matches.`;
    imagePath = `${base}/og/league/${toUrlName(slug)}.png`;
    imageAlt = `${leagueName} standings table`;

    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
        { '@type': 'ListItem', position: 2, name: leagueName, item: `${base}${paths.league(slug)}` },
        { '@type': 'ListItem', position: 3, name: 'Table', item: `${base}${canonicalPath}` },
      ],
    });
  } else if (page.kind === 'static') {
    if (page.page === 'tactics') {
      canonicalPath = paths.tactics();
      ogTitle = 'Football tactics board: set up both teams\' line-ups';
      title = `${ogTitle} | ${brand}`;
      description = 'Pick two teams, load their real line-ups, drag players into position and share the board as a link or image.';
      imagePath = `${base}/og/site/tactics.png`;
    } else if (page.page === 'replay') {
      canonicalPath = paths.replay();
      ogTitle = '2D match replay from real tracking data';
      title = `${ogTitle} | ${brand}`;
      description = 'Watch full matches as a 2D replay built from open player-tracking data, with team shape and space control.';
      imagePath = `${base}/og/site/replay.png`;
    } else if (page.page === 'about') {
      canonicalPath = paths.about();
      ogTitle = 'About Matchday Arena: data sources and how our xG works';
      title = `${ogTitle} | ${brand}`;
      description = 'Where our data comes from, how expected goals and win chances are calculated, and how accurate our predictions have been.';
      imagePath = `${base}/og/site/default.png`;
    }
  } else if (page.kind === 'notfound') {
    canonicalPath = '/404';
    ogTitle = 'Page not found';
    title = `${ogTitle} | ${brand}`;
    description = 'The requested page could not be found on Matchday Arena.';
  }

  return {
    title,
    description,
    canonical: `${base}${canonicalPath}`,
    robots,
    og: {
      site_name: brand,
      type: 'website',
      title: ogTitle,
      description,
      url: `${base}${canonicalPath}`,
      image: imagePath,
      imageWidth: 1200,
      imageHeight: 675,
      imageAlt,
    },
    twitter: {
      card: 'summary_large_image',
    },
    jsonLd,
  };
}

export function renderHeadTags(head) {
  if (!head) return '';

  const tags = [
    `<title>${escapeHtml(head.title)}</title>`,
    `<meta name="description" content="${escapeHtml(head.description)}">`,
    `<link rel="canonical" href="${escapeHtml(head.canonical)}">`,
    `<meta name="robots" content="${escapeHtml(head.robots)}">`,
    `<meta property="og:site_name" content="${escapeHtml(head.og?.site_name || 'Matchday Arena')}">`,
    `<meta property="og:type" content="${escapeHtml(head.og?.type || 'website')}">`,
    `<meta property="og:title" content="${escapeHtml(head.og?.title || head.title)}">`,
    `<meta property="og:description" content="${escapeHtml(head.og?.description || head.description)}">`,
    `<meta property="og:url" content="${escapeHtml(head.og?.url || head.canonical)}">`,
    `<meta property="og:image" content="${escapeHtml(head.og?.image || '')}">`,
    `<meta property="og:image:width" content="${head.og?.imageWidth || 1200}">`,
    `<meta property="og:image:height" content="${head.og?.imageHeight || 675}">`,
    `<meta property="og:image:alt" content="${escapeHtml(head.og?.imageAlt || head.title)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
  ];

  if (Array.isArray(head.jsonLd)) {
    for (const item of head.jsonLd) {
      tags.push(`<script type="application/ld+json">${jsonLdScript(item)}</script>`);
    }
  }

  return tags.join('\n');
}
