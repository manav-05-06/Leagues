import { Trophy, Shield, Award, Globe, Flame } from 'lucide-react';

export const LEAGUE_CATEGORIES = [
  { id: 'all', label: 'All Competitions', icon: Trophy },
  { id: 'top', label: 'Top European', icon: Shield },
  { id: 'cups', label: 'European & Continental Cups', icon: Award },
  { id: 'international', label: 'International', icon: Globe },
  { id: 'global', label: 'Global Leagues', icon: Flame },
];

export const ALL_LEAGUES = [
  // All Featured
  { id: 'all', name: 'All Matches', category: 'all', icon: '⚽' },

  // European & Continental Cups
  { id: 'uefa.champions', name: 'Champions League', category: 'cups', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/2.png' },
  { id: 'uefa.europa', name: 'Europa League', category: 'cups', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/2310.png' },
  { id: 'uefa.europa.conf', name: 'Conference League', category: 'cups', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/20296.png' },
  { id: 'conmebol.libertadores', name: 'Copa Libertadores', category: 'cups', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/58.png' },
  { id: 'eng.fa', name: 'FA Cup', category: 'cups', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/40.png' },
  { id: 'esp.copa_del_rey', name: 'Copa del Rey', category: 'cups', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/80.png' },

  // Top Domestic Leagues
  { id: 'eng.1', name: 'Premier League', category: 'top', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/23.png' },
  { id: 'esp.1', name: 'La Liga', category: 'top', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/15.png' },
  { id: 'ita.1', name: 'Serie A', category: 'top', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/12.png' },
  { id: 'ger.1', name: 'Bundesliga', category: 'top', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/10.png' },
  { id: 'fra.1', name: 'Ligue 1', category: 'top', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/9.png' },
  { id: 'ned.1', name: 'Eredivisie', category: 'top', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/11.png' },
  { id: 'por.1', name: 'Primeira Liga', category: 'top', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/14.png' },

  // International Tournaments
  { id: 'uefa.nations', name: 'UEFA Nations League', category: 'international', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/2395.png' },
  { id: 'fifa.world', name: 'FIFA World Cup', category: 'international', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/4.png' },
  { id: 'uefa.euro', name: 'UEFA Euro', category: 'international', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/53.png' },
  { id: 'fifa.friendly', name: 'Intl Friendlies', category: 'international', icon: '🌍' },

  // Global Leagues
  { id: 'usa.1', name: 'MLS', category: 'global', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/19.png' },
  { id: 'ksa.1', name: 'Saudi Pro League', category: 'global', logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/2488.png' },
];

export const SUPPORTED_LEAGUES = ALL_LEAGUES.filter(l => l.id !== 'all');
export const SUPPORTED_LEAGUE_SLUGS = SUPPORTED_LEAGUES.map(l => l.id);
