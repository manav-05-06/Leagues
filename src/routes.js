import { toUrlName } from './seo/leagues.js';

export function slugify(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

export const paths = {
  home: () => '/',
  match: (matchOrParams) => {
    if (!matchOrParams) return '/';
    const id = matchOrParams.id || matchOrParams.eventId;
    if (!id) return '/';

    let homeName = '';
    let awayName = '';

    if (matchOrParams.home && typeof matchOrParams.home === 'object') {
      homeName = matchOrParams.home.name || '';
    } else if (typeof matchOrParams.home === 'string') {
      homeName = matchOrParams.home;
    } else if (matchOrParams.homeTeam?.name) {
      homeName = matchOrParams.homeTeam.name;
    }

    if (matchOrParams.away && typeof matchOrParams.away === 'object') {
      awayName = matchOrParams.away.name || '';
    } else if (typeof matchOrParams.away === 'string') {
      awayName = matchOrParams.away;
    } else if (matchOrParams.awayTeam?.name) {
      awayName = matchOrParams.awayTeam.name;
    }

    let slug = '';
    if (homeName && awayName) {
      slug = slugify(`${homeName} vs ${awayName}`);
    } else if (matchOrParams.slug) {
      slug = slugify(matchOrParams.slug);
    }

    return slug ? `/match/${id}/${slug}` : `/match/${id}`;
  },
  team: (teamOrParams) => {
    if (!teamOrParams) return '/';
    const id = teamOrParams.id || teamOrParams.teamId;
    if (!id) return '/';
    const name = teamOrParams.name || teamOrParams.displayName || '';
    const slug = slugify(name || teamOrParams.slug || '');
    return slug ? `/team/${id}/${slug}` : `/team/${id}`;
  },
  league: (espnSlug) => {
    const urlName = toUrlName(espnSlug);
    return `/league/${urlName}`;
  },
  table: (espnSlug) => {
    const urlName = toUrlName(espnSlug);
    return `/league/${urlName}/table`;
  },
  tactics: () => '/tactics',
  replay: () => '/replay',
  about: () => '/about',
};
