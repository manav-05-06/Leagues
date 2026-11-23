export const COVERED_LEAGUES = [
  'eng.1',
  'esp.1',
  'ita.1',
  'ger.1',
  'fra.1',
  'uefa.champions',
];

export const TEAM_SITEMAP_LEAGUES = [
  'eng.1',
  'esp.1',
  'ita.1',
  'ger.1',
  'fra.1',
  'ned.1',
  'por.1',
  'usa.1',
  'ksa.1',
];

export const LEAGUE_SEO_DATA = {
  'eng.1': { urlName: 'premier-league', name: 'Premier League', timeZone: 'Europe/London' },
  'esp.1': { urlName: 'la-liga', name: 'La Liga', timeZone: 'Europe/Madrid' },
  'ita.1': { urlName: 'serie-a', name: 'Serie A', timeZone: 'Europe/Rome' },
  'ger.1': { urlName: 'bundesliga', name: 'Bundesliga', timeZone: 'Europe/Berlin' },
  'fra.1': { urlName: 'ligue-1', name: 'Ligue 1', timeZone: 'Europe/Paris' },
  'uefa.champions': { urlName: 'champions-league', name: 'Champions League', timeZone: 'Europe/Paris' },
  'ned.1': { urlName: 'eredivisie', name: 'Eredivisie', timeZone: 'Europe/Amsterdam' },
  'por.1': { urlName: 'primeira-liga', name: 'Primeira Liga', timeZone: 'Europe/Lisbon' },
  'usa.1': { urlName: 'mls', name: 'MLS', timeZone: 'America/New_York' },
  'ksa.1': { urlName: 'saudi-pro-league', name: 'Saudi Pro League', timeZone: 'Asia/Riyadh' },
  'uefa.europa': { urlName: 'europa-league', name: 'Europa League', timeZone: 'Europe/Paris' },
  'uefa.europa.conf': { urlName: 'conference-league', name: 'Conference League', timeZone: 'Europe/Paris' },
  'conmebol.libertadores': { urlName: 'copa-libertadores', name: 'Copa Libertadores', timeZone: 'America/Sao_Paulo' },
  'eng.fa': { urlName: 'fa-cup', name: 'FA Cup', timeZone: 'Europe/London' },
  'esp.copa_del_rey': { urlName: 'copa-del-rey', name: 'Copa del Rey', timeZone: 'Europe/Madrid' },
  'uefa.nations': { urlName: 'nations-league', name: 'UEFA Nations League', timeZone: 'Europe/Paris' },
  'fifa.world': { urlName: 'world-cup', name: 'FIFA World Cup', timeZone: 'UTC' },
  'uefa.euro': { urlName: 'euro', name: 'UEFA Euro', timeZone: 'Europe/Paris' },
  'fifa.friendly': { urlName: 'international-friendlies', name: 'International Friendlies', timeZone: 'UTC' },
};

const URL_TO_ESPN = Object.entries(LEAGUE_SEO_DATA).reduce((acc, [espnSlug, data]) => {
  acc[data.urlName] = espnSlug;
  return acc;
}, {});

export function toUrlName(espnSlug) {
  return LEAGUE_SEO_DATA[espnSlug]?.urlName || espnSlug;
}

export function fromUrlName(urlName) {
  return URL_TO_ESPN[urlName] || null;
}

export function getLeagueSeo(espnSlug) {
  return LEAGUE_SEO_DATA[espnSlug] || null;
}
