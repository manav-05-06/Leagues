import { toUrlName, LEAGUE_SEO_DATA } from './leagues.js';

export function matchFromSummary(summary) {
  if (!summary || !summary.header) return null;

  const header = summary.header;
  const comp = header.competitions?.[0] || {};
  const competitors = comp.competitors || [];
  const homeComp = competitors.find((c) => c.homeAway === 'home') || competitors[0] || {};
  const awayComp = competitors.find((c) => c.homeAway === 'away') || competitors[1] || {};

  const statusType = comp.status?.type || {};
  let status = 'upcoming';
  if (statusType.state === 'in') {
    status = 'live';
  } else if (statusType.completed || statusType.state === 'post') {
    if (statusType.completed === false) {
      status = 'postponed';
    } else {
      status = 'finished';
    }
  }

  const minute = status === 'live' ? statusType.shortDetail || "Live" : null;

  const espnSlug = header.league?.slug || '';
  const leagueName = header.league?.abbreviation || header.league?.name || 'Soccer';
  const urlName = toUrlName(espnSlug);

  const venue = summary.gameInfo?.venue
    ? {
        name: summary.gameInfo.venue.fullName || '',
        city: summary.gameInfo.venue.address?.city || '',
      }
    : null;

  const homeTeam = homeComp.team || {};
  const awayTeam = awayComp.team || {};

  const home = {
    id: String(homeTeam.id || homeComp.id || ''),
    name: homeTeam.displayName || homeTeam.name || 'Home Team',
    short: homeTeam.abbreviation || '',
    score: Number(homeComp.score ?? 0),
    color: homeTeam.color ? (homeTeam.color.startsWith('#') ? homeTeam.color.slice(1) : homeTeam.color) : '00ff87',
    logo: homeTeam.logos?.[0]?.href || '',
  };

  const away = {
    id: String(awayTeam.id || awayComp.id || ''),
    name: awayTeam.displayName || awayTeam.name || 'Away Team',
    short: awayTeam.abbreviation || '',
    score: Number(awayComp.score ?? 0),
    color: awayTeam.color ? (awayTeam.color.startsWith('#') ? awayTeam.color.slice(1) : awayTeam.color) : '00f2fe',
    logo: awayTeam.logos?.[0]?.href || '',
  };

  // Goals from keyEvents
  const keyEvents = summary.keyEvents || [];
  const goals = [];
  keyEvents.forEach((ev) => {
    if (ev.scoringPlay && !ev.shootout) {
      const athlete = ev.participants?.[0]?.athlete;
      const playerName = athlete?.displayName || athlete?.fullName || 'Goal';
      // ESPN already sends "16'" or "90'+5'"; add the mark only if it's missing.
      const rawClock = String(ev.clock?.displayValue || '').trim();
      const clock = rawClock ? (rawClock.endsWith("'") ? rawClock : `${rawClock}'`) : '';
      const side = String(ev.team?.id) === String(home.id) ? 'home' : 'away';
      goals.push({
        player: playerName,
        minute: clock,
        side,
        ownGoal: Boolean(ev.ownGoal),
      });
    }
  });

  return {
    kind: 'match',
    id: String(header.id),
    league: {
      espnSlug,
      name: leagueName,
      urlName,
      timeZone: LEAGUE_SEO_DATA[espnSlug]?.timeZone || 'UTC',
    },
    status,
    minute,
    kickoff: comp.date || '',
    venue,
    home,
    away,
    goals,
    xg: null,
    prediction: null,
  };
}

export function teamFromEspn(teamJson, scheduleJson) {
  if (!teamJson) return null;
  const team = teamJson.team || teamJson;
  const id = String(team.id || '');
  const name = team.displayName || team.name || '';
  const short = team.abbreviation || '';
  const color = team.color ? (team.color.startsWith('#') ? team.color.slice(1) : team.color) : '00ff87';
  const logo = team.logos?.[0]?.href || '';
  const standingSummary = team.standingSummary || '';
  const defaultLeague = team.defaultLeague?.slug || '';

  const events = scheduleJson?.events || [];
  const completed = events.filter((e) => {
    const s = e.competitions?.[0]?.status?.type || {};
    return Boolean(s.completed) || s.state === 'post';
  });
  completed.sort((a, b) => new Date(b.date) - new Date(a.date));

  const upcoming = events.filter((e) => {
    const s = e.competitions?.[0]?.status?.type || {};
    return !s.completed && s.state === 'pre';
  });
  upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

  const last5 = completed.slice(0, 5).map((e) => {
    const comp = e.competitions?.[0] || {};
    const teamComp = (comp.competitors || []).find((c) => String(c.id) === id || String(c.team?.id) === id);
    const oppComp = (comp.competitors || []).find((c) => String(c.id) !== id && String(c.team?.id) !== id);
    const scoreA = Number(teamComp?.score?.displayValue ?? teamComp?.score ?? 0);
    const scoreB = Number(oppComp?.score?.displayValue ?? oppComp?.score ?? 0);
    let outcome = 'D';
    if (scoreA > scoreB) outcome = 'W';
    else if (scoreA < scoreB) outcome = 'L';
    return {
      id: String(e.id),
      date: e.date,
      opponent: oppComp?.team?.displayName || oppComp?.team?.name || 'Opponent',
      score: `${scoreA}-${scoreB}`,
      outcome,
    };
  });

  const nextMatch = upcoming[0] ? {
    id: String(upcoming[0].id),
    date: upcoming[0].date,
    opponent: (upcoming[0].competitions?.[0]?.competitors || []).find((c) => String(c.id) !== id && String(c.team?.id) !== id)?.team?.displayName || 'Opponent',
  } : null;

  return {
    kind: 'team',
    id,
    name,
    short,
    color,
    logo,
    standingSummary,
    defaultLeague,
    nextMatch,
    last5,
    upcoming5: upcoming.slice(0, 5),
  };
}
