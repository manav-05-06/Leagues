import { ALL_LEAGUES, SUPPORTED_LEAGUES } from './constants/leagues.js';

export function formatKickoff(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function normalizeDateKey(date) {
  if (!date) return getTodayDateKey();
  if (typeof date === 'string') {
    const cleaned = date.replace(/-/g, '');
    if (/^\d{8}$/.test(cleaned)) return cleaned;
  }
  if (date instanceof Date && !isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
  return getTodayDateKey();
}

export function isTodayKey(dateKey) {
  return normalizeDateKey(dateKey) === getTodayDateKey();
}

export function isPastDateKey(dateKey) {
  return normalizeDateKey(dateKey) < getTodayDateKey();
}

export function shiftDateKey(dateKey, offsetDays) {
  const norm = normalizeDateKey(dateKey);
  const year = parseInt(norm.slice(0, 4), 10);
  const month = parseInt(norm.slice(4, 6), 10) - 1;
  const day = parseInt(norm.slice(6, 8), 10);
  const d = new Date(year, month, day + offsetDays);
  return normalizeDateKey(d);
}

export function formatDateKeyDisplay(dateKey) {
  const norm = normalizeDateKey(dateKey);
  const year = parseInt(norm.slice(0, 4), 10);
  const month = parseInt(norm.slice(4, 6), 10) - 1;
  const day = parseInt(norm.slice(6, 8), 10);
  const d = new Date(year, month, day);
  const isToday = isTodayKey(norm);
  const formatted = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return isToday ? `Today • ${formatted}` : formatted;
}

export function mapEvent(event, defaultLeagueInfo = {}) {
  if (!event) return null;

  const competition = event.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const homeCompetitor = competitors.find(c => c.homeAway === 'home') || competitors[0];
  const awayCompetitor = competitors.find(c => c.homeAway === 'away') || competitors[1];

  const leagueName = event.league?.name || defaultLeagueInfo.name || 'Unknown League';
  const leagueSlug = event.league?.slug || event.league?.id || defaultLeagueInfo.slug || defaultLeagueInfo.id || 'eng.1';
  const leagueLogo = event.league?.logos?.find(l => l.rel?.includes('dark'))?.href 
    || event.league?.logos?.[0]?.href 
    || event.league?.logo 
    || defaultLeagueInfo.logo 
    || null;

  const statusType = competition.status?.type || {};
  const statusState = statusType.state || 'pre';
  const isCompleted = Boolean(statusType.completed);
  const detail = statusType.detail || statusType.description || '';

  let status = 'upcoming';
  let statusDetail = detail;

  if (statusState === 'in') {
    status = 'live';
    statusDetail = detail || (competition.status?.displayClock ? `${competition.status.displayClock}'` : 'LIVE');
  } else if (statusState === 'post') {
    if (isCompleted) {
      status = 'finished';
      if (/aet|pen|pk|extra/i.test(detail)) {
        statusDetail = detail.replace(/Final[\s/-]*/i, '').trim() || detail;
      } else {
        statusDetail = 'FT';
      }
    } else {
      status = 'postponed';
      statusDetail = detail || 'Postponed';
    }
  } else {
    status = 'upcoming';
    statusDetail = detail || 'Scheduled';
  }

  const kickoff = event.date || competition.date || null;

  const homeLogoUrl = homeCompetitor?.team?.logo 
    || homeCompetitor?.team?.logos?.[0]?.href 
    || null;
  const awayLogoUrl = awayCompetitor?.team?.logo 
    || awayCompetitor?.team?.logos?.[0]?.href 
    || null;

  const homeColor = homeCompetitor?.team?.color ? `#${homeCompetitor.team.color.replace(/^#/, '')}` : null;
  const homeAltColor = homeCompetitor?.team?.alternateColor ? `#${homeCompetitor.team.alternateColor.replace(/^#/, '')}` : null;
  const awayColor = awayCompetitor?.team?.color ? `#${awayCompetitor.team.color.replace(/^#/, '')}` : null;
  const awayAltColor = awayCompetitor?.team?.alternateColor ? `#${awayCompetitor.team.alternateColor.replace(/^#/, '')}` : null;

  return {
    id: String(event.id || competition.id),
    league: leagueName,
    leagueLogo,
    leagueSlug,
    kickoff,
    status,
    statusDetail,
    statusState,
    score: statusState !== 'pre' ? {
      home: homeCompetitor?.score ?? '0',
      away: awayCompetitor?.score ?? '0',
    } : null,
    time: statusState === 'pre' && kickoff ? formatKickoff(kickoff) : statusDetail,
    homeTeam: {
      id: homeCompetitor?.team?.id,
      name: homeCompetitor?.team?.displayName || homeCompetitor?.team?.name || 'Unknown',
      logoUrl: homeLogoUrl,
      logo: homeLogoUrl,
      color: homeColor,
      altColor: homeAltColor,
    },
    awayTeam: {
      id: awayCompetitor?.team?.id,
      name: awayCompetitor?.team?.displayName || awayCompetitor?.team?.name || 'Unknown',
      logoUrl: awayLogoUrl,
      logo: awayLogoUrl,
      color: awayColor,
      altColor: awayAltColor,
    },
    homeTeamId: homeCompetitor?.team?.id,
    awayTeamId: awayCompetitor?.team?.id,
    details: competition.details || [],
    seasonYear: event.season?.year != null ? Number(event.season.year) : null,
  };
}

export function mapSummaryHeader(header) {
  if (!header) return null;
  const competition = header.competitions?.[0] || {};
  const leagueObj = header.league || {};
  const leagueName = leagueObj.name || leagueObj.description || 'Unknown League';
  const leagueSlug = leagueObj.slug || leagueObj.id || 'eng.1';
  const leagueLogo = leagueObj.logos?.find(l => l.rel?.includes('dark'))?.href 
    || leagueObj.logos?.[0]?.href 
    || null;

  return mapEvent({
    id: header.id || competition.id,
    date: competition.date || header.date,
    season: header.season || leagueObj.season,
    competitions: header.competitions,
    league: {
      name: leagueName,
      slug: leagueSlug,
      logos: leagueObj.logos,
      logo: leagueLogo,
    },
  });
}

export async function fetchDayMatches(dateKey) {
  const key = normalizeDateKey(dateKey);
  const leagues = SUPPORTED_LEAGUES;

  const results = await Promise.allSettled(
    leagues.map(async (league) => {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.id}/scoreboard?dates=${key}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`ESPN API returned ${res.status} for ${league.id}`);
      }
      const data = await res.json();
      return { league, data };
    })
  );

  const matches = [];
  const failedLeagues = [];
  const seenMatchIds = new Set();

  results.forEach((result, idx) => {
    const league = leagues[idx];
    if (result.status === 'fulfilled') {
      const { data } = result.value;
      const leagueName = data.leagues?.[0]?.name || league.name;
      const leagueSlug = data.leagues?.[0]?.slug || data.leagues?.[0]?.abbreviation?.toLowerCase() || league.id;
      const leagueLogo = data.leagues?.[0]?.logos?.find(l => l.rel?.includes('dark'))?.href 
        || data.leagues?.[0]?.logos?.[0]?.href 
        || league.logo 
        || null;
      const fallbackInfo = { name: leagueName, slug: leagueSlug, logo: leagueLogo };

      const events = data.events || [];
      events.forEach(event => {
        if (!seenMatchIds.has(event.id)) {
          seenMatchIds.add(event.id);
          const mapped = mapEvent(event, fallbackInfo);
          if (mapped) matches.push(mapped);
        }
      });
    } else {
      failedLeagues.push({
        id: league.id,
        name: league.name,
        error: result.reason?.message || 'Failed to load',
      });
    }
  });

  if (failedLeagues.length === leagues.length) {
    throw new Error('All leagues failed to load matches.');
  }

  return { matches, failedLeagues };
}

export async function fetchLeagueSeason(slug, season) {
  if (!slug || slug === 'all') return { matches: [], failedLeagues: [] };

  const year1 = String(season);
  const year2 = String(parseInt(season, 10) + 1);

  const league = ALL_LEAGUES.find(l => l.id === slug) || { id: slug, name: slug };
  const endpoints = [
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${year1}&limit=500`,
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${year2}&limit=500`,
  ];

  const results = await Promise.allSettled(
    endpoints.map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`ESPN API returned ${res.status}`);
      return res.json();
    })
  );

  const fulfilled = results.filter(r => r.status === 'fulfilled');
  if (fulfilled.length === 0) {
    throw new Error(`Failed to load matches for ${league.name}`);
  }

  const failedLeagues = results.some(r => r.status === 'rejected')
    ? [{ id: slug, name: league.name, error: 'One or more season requests failed' }]
    : [];

  const matches = [];
  const seenMatchIds = new Set();
  const seasonNum = Number(season);
  const startDateStr = `${seasonNum}-07-01T00:00:00Z`;
  const endDateStr = `${seasonNum + 1}-06-30T23:59:59Z`;

  for (const r of fulfilled) {
    const data = r.value;
    if (!data || !data.events) continue;

    const leagueName = data.leagues?.[0]?.name || league.name;
    const leagueSlug = data.leagues?.[0]?.slug || data.leagues?.[0]?.abbreviation?.toLowerCase() || slug;
    const leagueLogo = data.leagues?.[0]?.logos?.find(l => l.rel?.includes('dark'))?.href 
      || data.leagues?.[0]?.logos?.[0]?.href 
      || league.logo 
      || null;
    const fallbackInfo = { name: leagueName, slug: leagueSlug, logo: leagueLogo };

    // Filter events by season year only (Jul 1 - Jun 30 fallback)
    const seasonEvents = data.events.filter(e => {
      if (e.season?.year != null) {
        return Number(e.season.year) === seasonNum;
      }
      if (e.date) {
        return e.date >= startDateStr && e.date <= endDateStr;
      }
      return true;
    });

    for (const event of seasonEvents) {
      if (!seenMatchIds.has(event.id)) {
        seenMatchIds.add(event.id);
        const mapped = mapEvent(event, fallbackInfo);
        if (mapped) matches.push(mapped);
      }
    }
  }

  return { matches, failedLeagues };
}

export async function fetchEspnMatches(leagueCode = 'all', season) {
  if (leagueCode === 'all') {
    const result = await fetchDayMatches(getTodayDateKey());
    return result.matches;
  }
  const result = await fetchLeagueSeason(leagueCode, season);
  return result.matches;
}

export async function fetchMatchSummary(matchId) {
  if (!matchId) return null;
  // soccer/all/summary works without knowing the league slug
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${matchId}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ESPN API returned ${res.status}`);
  }
  return res.json();
}

export async function fetchPlayerProfile(playerId, leagueSlug = 'eng.1') {
  if (!playerId) return null;
  const slug = leagueSlug || 'eng.1';
  const url = `https://site.api.espn.com/apis/common/v3/sports/soccer/${slug}/athletes/${playerId}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ESPN API returned ${res.status}`);
  }
  const data = await res.json();
  return data.athlete;
}

export async function fetchPlayerSeasonStats(teamId, season, leagueSlug, playerId) {
  if (!teamId || !season || !leagueSlug || !playerId) return null;
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueSlug}/teams/${teamId}/roster?season=${season}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    let athletesArray = [];
    if (data.athletes && Array.isArray(data.athletes)) {
      if (data.athletes[0]?.items) {
        data.athletes.forEach(group => {
          athletesArray = athletesArray.concat(group.items);
        });
      } else {
        athletesArray = data.athletes;
      }
    }

    const athlete = athletesArray.find(a => String(a.id) === String(playerId));
    if (athlete && athlete.statistics?.splits?.categories) {
      const off = athlete.statistics.splits.categories.find(c => c.name === 'offensive') || { stats: [] };
      const gk = athlete.statistics.splits.categories.find(c => c.name === 'goalKeeping') || { stats: [] };

      const getStat = (arr, name) => arr.find(s => s.name === name)?.displayValue || '0';

      return {
        goals: getStat(off.stats, 'totalGoals'),
        assists: getStat(off.stats, 'goalAssists'),
        shots: getStat(off.stats, 'totalShots'),
        saves: getStat(gk.stats, 'saves'),
      };
    }
    return null;
  } catch (err) {
    console.error('Error fetching season stats:', err);
    return null;
  }
}

export async function fetchFullPlayerProfile(playerId, teamId, leagueSlug = 'eng.1', season) {
  if (!playerId) return null;
  const slug = leagueSlug || 'eng.1';
  const profile = await fetchPlayerProfile(playerId, slug);
  const targetTeamId = teamId || profile?.team?.id;
  let seasonStats = null;
  if (targetTeamId && season) {
    seasonStats = await fetchPlayerSeasonStats(targetTeamId, season, slug, playerId);
  }
  return { profile, seasonStats };
}

export async function searchPlayers(query) {
  if (!query || query.trim() === '') return [];
  const url = `https://site.api.espn.com/apis/search/v2?query=${encodeURIComponent(query)}&limit=20`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ESPN Search API returned ${res.status}`);
  }
  const data = await res.json();

  const playerResults = data.results?.find(r => r.type === 'player');
  if (!playerResults || !playerResults.contents) return [];

  return playerResults.contents
    .filter(p => p.sport === 'soccer')
    .map(p => {
      const idMatch = p.uid.match(/~a:(\d+)/);
      return {
        id: idMatch ? idMatch[1] : null,
        name: p.displayName,
        team: p.subtitle,
        league: p.description,
        leagueSlug: p.defaultLeagueSlug,
        photo: p.image?.default || p.image?.defaultDark,
      };
    })
    .filter(p => p.id !== null);
}

export async function fetchLeagueStandings(leagueSlug = 'eng.1', season) {
  const slug = (leagueSlug && leagueSlug !== 'all') ? leagueSlug : 'eng.1';
  const url = `https://site.api.espn.com/apis/v2/sports/soccer/${slug}/standings?season=${season}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ESPN Standings returned ${res.status}`);
  }
  const data = await res.json();

  const groups = (data.children || []).map(child => {
    const groupName = child.name || child.abbreviation || 'League Standings';
    const rawEntries = child.standings?.entries || [];

    const entries = rawEntries.map(entry => {
      const getStat = (name) => entry.stats?.find(s => s.name === name)?.displayValue || '0';

      return {
        id: entry.team?.id,
        rank: parseInt(getStat('rank') || entry.team?.rank || '0', 10) || 1,
        team: {
          id: entry.team?.id,
          name: entry.team?.displayName || entry.team?.name || 'Unknown',
          shortName: entry.team?.shortDisplayName || entry.team?.abbreviation || '',
          logo: entry.team?.logos?.[0]?.href || null,
        },
        stats: {
          played: getStat('gamesPlayed'),
          wins: getStat('wins'),
          draws: getStat('ties'),
          losses: getStat('losses'),
          goalsFor: getStat('pointsFor'),
          goalsAgainst: getStat('pointsAgainst'),
          goalDiff: getStat('pointDifferential'),
          points: getStat('points'),
          deductions: getStat('deductions'),
          form: entry.stats?.find(s => s.name === 'form')?.displayValue || '',
        },
        note: entry.note || null,
      };
    });

    entries.sort((a, b) => a.rank - b.rank);

    return {
      groupName,
      entries,
    };
  });

  return {
    leagueName: data.name || 'Official Standings',
    season: data.season || season,
    groups,
  };
}

/**
 * Tactics Board Fetchers
 */

export async function fetchLeagueTeams(slug) {
  if (!slug) return [];
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ESPN API returned ${res.status}`);
  }
  const data = await res.json();
  const rawTeams = data.sports?.[0]?.leagues?.[0]?.teams || [];

  const teams = rawTeams.map((t) => {
    const team = t.team || t;
    const color = team.color ? (team.color.startsWith('#') ? team.color : `#${team.color}`) : '#00ff87';
    const altColor = team.alternateColor ? (team.alternateColor.startsWith('#') ? team.alternateColor : `#${team.alternateColor}`) : null;
    return {
      id: String(team.id),
      name: team.displayName || team.name || '',
      short: team.abbreviation || team.shortDisplayName || '',
      color,
      altColor,
      logo: team.logos?.[0]?.href || '',
    };
  });

  teams.sort((a, b) => a.name.localeCompare(b.name));
  return teams;
}

export async function fetchTeamSquad(slug, teamId) {
  if (!slug || !teamId) return [];
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams/${teamId}/roster`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ESPN API returned ${res.status}`);
  }
  const data = await res.json();

  let athletesArray = [];
  if (data.athletes && Array.isArray(data.athletes)) {
    if (data.athletes[0]?.items) {
      data.athletes.forEach((group) => {
        if (Array.isArray(group.items)) {
          athletesArray = athletesArray.concat(group.items);
        }
      });
    } else {
      athletesArray = data.athletes;
    }
  }

  return athletesArray.map((athlete) => {
    const fullName = athlete.displayName || athlete.fullName || athlete.name || '';
    const words = fullName.trim().split(/\s+/);
    const shortName = (words[words.length - 1] || fullName).slice(0, 12);

    let rawPos = (athlete.position?.abbreviation || '').toUpperCase();
    let pos = 'M';
    if (rawPos.startsWith('G')) pos = 'G';
    else if (rawPos.startsWith('D')) pos = 'D';
    else if (rawPos.startsWith('M')) pos = 'M';
    else if (rawPos.startsWith('F')) pos = 'F';

    return {
      id: String(athlete.id),
      name: fullName,
      shortName,
      jersey: athlete.jersey != null ? String(athlete.jersey) : '',
      pos,
    };
  });
}

export async function fetchTeamLastLineup(slug, teamId) {
  if (!slug || !teamId) return null;
  const schedUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams/${teamId}/schedule`;
  const schedRes = await fetch(schedUrl);
  if (!schedRes.ok) return null;
  const schedData = await schedRes.json();

  const events = schedData.events || [];
  const completedEvents = events.filter((e) => {
    const comp = e.competitions?.[0];
    const statusType = comp?.status?.type || {};
    return Boolean(statusType.completed) || statusType.state === 'post';
  });

  if (completedEvents.length === 0) return null;

  // Sort newest first
  completedEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestMatch = completedEvents[0];
  const comp = latestMatch.competitions?.[0] || {};
  const competitors = comp.competitors || [];

  const teamComp = competitors.find((c) => String(c.id) === String(teamId) || String(c.team?.id) === String(teamId));
  const oppComp = competitors.find((c) => String(c.id) !== String(teamId) && String(c.team?.id) !== String(teamId));

  const opponent = oppComp?.team?.displayName || oppComp?.team?.name || 'Opponent';
  const teamScore = teamComp?.score?.displayValue ?? teamComp?.score ?? '0';
  const oppScore = oppComp?.score?.displayValue ?? oppComp?.score ?? '0';
  const score = `${teamScore}-${oppScore}`;

  // Formatted date (e.g. "29 Oct")
  let dateStr = '';
  if (latestMatch.date) {
    const d = new Date(latestMatch.date);
    if (!isNaN(d.getTime())) {
      dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }
  }

  // Fetch summary to extract roster and formation
  const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${latestMatch.id}`;
  const summaryRes = await fetch(summaryUrl);
  if (!summaryRes.ok) return null;
  const summaryData = await summaryRes.json();

  const rosters = summaryData.rosters || [];
  const teamRoster = rosters.find(
    (r) => String(r.team?.id) === String(teamId)
  );

  if (!teamRoster || !Array.isArray(teamRoster.roster)) return null;

  const starters = [];
  teamRoster.roster.forEach((p) => {
    const slot = Number(p.formationPlace);
    if (p.starter || (!isNaN(slot) && slot >= 1 && slot <= 11)) {
      starters.push({
        id: String(p.athlete?.id || p.id),
        name: p.athlete?.displayName || p.athlete?.fullName || p.athlete?.name || '',
        jersey: String(p.jersey || ''),
        slot: isNaN(slot) ? starters.length + 1 : slot,
      });
    }
  });

  if (starters.length === 0) return null;
  starters.sort((a, b) => a.slot - b.slot);

  return {
    eventId: String(latestMatch.id),
    date: dateStr,
    opponent,
    score,
    formation: teamRoster.formation || '4-3-3',
    starters,
  };
}

export async function fetchMatchLineups(eventId) {
  if (!eventId) return { home: null, away: null };
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${eventId}`;
  const res = await fetch(url);
  if (!res.ok) return { home: null, away: null };
  const data = await res.json();

  const comp = data.header?.competitions?.[0] || data.competitions?.[0] || {};
  const competitors = comp.competitors || [];
  const homeComp = competitors.find((c) => c.homeAway === 'home') || competitors[0];
  const awayComp = competitors.find((c) => c.homeAway === 'away') || competitors[1];

  const rosters = data.rosters || [];

  const parseSide = (competitor) => {
    if (!competitor) return null;
    const teamId = String(competitor.id || competitor.team?.id);
    const teamRoster = rosters.find((r) => String(r.team?.id) === teamId);
    if (!teamRoster || !Array.isArray(teamRoster.roster)) return null;

    const starters = [];
    teamRoster.roster.forEach((p) => {
      const slot = Number(p.formationPlace);
      if (p.starter || (!isNaN(slot) && slot >= 1 && slot <= 11)) {
        starters.push({
          id: String(p.athlete?.id || p.id),
          name: p.athlete?.displayName || p.athlete?.fullName || p.athlete?.name || '',
          jersey: String(p.jersey || ''),
          slot: isNaN(slot) ? starters.length + 1 : slot,
        });
      }
    });

    if (starters.length < 11) return null;
    starters.sort((a, b) => a.slot - b.slot);

    return {
      teamId,
      teamName: competitor.team?.displayName || competitor.team?.name || '',
      formation: teamRoster.formation || '4-3-3',
      starters,
    };
  };

  return {
    home: parseSide(homeComp),
    away: parseSide(awayComp),
  };
}
