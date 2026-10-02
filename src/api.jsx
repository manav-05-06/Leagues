export async function fetchEspnMatches(leagueCode = 'all', season = '2024') {
  try {
    // A football season (e.g., 2024-2025) spans across two calendar years.
    // For single-year/international tournaments, year1/year2 ensures full coverage.
    const year1 = season;
    const year2 = (parseInt(season) + 1).toString();

    const leaguesToFetch = leagueCode === 'all' 
      ? ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'uefa.champions', 'uefa.europa', 'uefa.nations'] 
      : [leagueCode];
    const endpoints = [];

    leaguesToFetch.forEach(league => {
      endpoints.push(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${year1}&limit=500`);
      endpoints.push(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${year2}&limit=500`);
    });

    const responses = await Promise.all(endpoints.map(url => fetch(url)));
    
    // Check if any requests failed
    for (const res of responses) {
      if (!res.ok) {
        console.warn(`ESPN API returned ${res.status} for ${res.url}`);
      }
    }

    const dataArr = await Promise.all(
      responses.map(res => (res.ok ? res.json() : { events: [] }))
    );

    let allMatches = [];
    const seenMatchIds = new Set();

    for (const data of dataArr) {
      if (!data || !data.events) continue;

      const leagueName = data.leagues?.[0]?.name || 'Unknown League';
      const defaultSlug = data.leagues?.[0]?.slug || data.leagues?.[0]?.abbreviation?.toLowerCase() || (leagueCode !== 'all' ? leagueCode : 'eng.1');
      const leagueLogo = data.leagues?.[0]?.logos?.find(l => l.rel?.includes('dark'))?.href || data.leagues?.[0]?.logos?.[0]?.href || null;

      // Filter events by season year or matching date range
      const seasonEvents = data.events.filter(e => {
        if (e.season?.year) {
          return e.season.year === parseInt(season) || e.season.year === parseInt(season) + 1;
        }
        if (e.date) {
          return e.date.startsWith(year1) || e.date.startsWith(year2);
        }
        return true;
      });

      const mappedEvents = seasonEvents.map((event) => {
        if (seenMatchIds.has(event.id)) return null;
        seenMatchIds.add(event.id);

        const competition = event.competitions?.[0] || {};
        const homeCompetitor = competition.competitors?.find(c => c.homeAway === 'home') || competition.competitors?.[0];
        const awayCompetitor = competition.competitors?.find(c => c.homeAway === 'away') || competition.competitors?.[1];
        
        const statusState = competition.status?.type?.state || 'pre';
        const statusDetail = competition.status?.type?.detail || 'Scheduled';

        return {
          id: event.id,
          league: leagueName,
          leagueLogo: leagueLogo,
          homeTeam: { 
            name: homeCompetitor?.team?.displayName || homeCompetitor?.team?.name || 'Unknown', 
            logo: (homeCompetitor?.team?.logo) ? <img src={homeCompetitor.team.logo} alt="logo" style={{width: '100%', height: '100%', objectFit: 'contain'}} /> : '⚽' 
          },
          awayTeam: { 
            name: awayCompetitor?.team?.displayName || awayCompetitor?.team?.name || 'Unknown', 
            logo: (awayCompetitor?.team?.logo) ? <img src={awayCompetitor.team.logo} alt="logo" style={{width: '100%', height: '100%', objectFit: 'contain'}} /> : '⚽' 
          },
          status: statusState === 'in' ? 'live' : (statusState === 'post' ? 'finished' : 'upcoming'),
          score: statusState !== 'pre' ? { 
            home: homeCompetitor?.score || '0', 
            away: awayCompetitor?.score || '0' 
          } : null,
          time: statusState === 'pre' && event.date 
            ? new Date(event.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
            : statusDetail,
          details: competition.details || [],
          homeTeamId: homeCompetitor?.team?.id,
          awayTeamId: awayCompetitor?.team?.id,
          leagueSlug: defaultSlug
        };
      }).filter(Boolean);

      allMatches = [...allMatches, ...mappedEvents];
    }
    
    return allMatches;
  } catch (error) {
    console.error("Error fetching ESPN matches:", error);
    throw error;
  }
}

export async function fetchMatchSummary(matchId, leagueSlug = 'eng.1') {
  try {
    const slug = leagueSlug || 'eng.1';
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/summary?event=${matchId}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`ESPN API returned ${res.status}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error(`Error fetching summary for match ${matchId}:`, error);
    throw error;
  }
}

export async function fetchPlayerProfile(playerId, leagueSlug = 'eng.1') {
  try {
    const slug = leagueSlug || 'eng.1';
    const url = `https://site.api.espn.com/apis/common/v3/sports/soccer/${slug}/athletes/${playerId}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`ESPN API returned ${res.status}`);
    }
    const data = await res.json();
    return data.athlete;
  } catch (error) {
    console.error(`Error fetching profile for player ${playerId}:`, error);
    throw error;
  }
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
         saves: getStat(gk.stats, 'saves')
       };
    }
    return null;
  } catch (err) {
    console.error("Error fetching season stats:", err);
    return null;
  }
}

export async function searchPlayers(query) {
  if (!query || query.trim() === '') return [];
  try {
    const url = `https://site.api.espn.com/apis/search/v2?query=${encodeURIComponent(query)}&limit=20`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`ESPN Search API returned ${res.status}`);
    }
    const data = await res.json();
    
    // Find the player results block
    const playerResults = data.results?.find(r => r.type === 'player');
    if (!playerResults || !playerResults.contents) return [];

    // Filter for soccer players and map fields
    return playerResults.contents
      .filter(p => p.sport === 'soccer')
      .map(p => {
        // Extract ID from uid: "s:600~a:253989" -> "253989"
        const idMatch = p.uid.match(/~a:(\d+)/);
        return {
          id: idMatch ? idMatch[1] : null,
          name: p.displayName,
          team: p.subtitle,
          league: p.description,
          leagueSlug: p.defaultLeagueSlug,
          photo: p.image?.default || p.image?.defaultDark
        };
      })
      .filter(p => p.id !== null);
  } catch (error) {
    console.error("Error searching players:", error);
    return [];
  }
}

export async function fetchLeagueStandings(leagueSlug = 'eng.1', season = '2024') {
  try {
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
          rank: parseInt(getStat('rank') || entry.team?.rank || '0') || 1,
          team: {
            id: entry.team?.id,
            name: entry.team?.displayName || entry.team?.name || 'Unknown',
            shortName: entry.team?.shortDisplayName || entry.team?.abbreviation || '',
            logo: entry.team?.logos?.[0]?.href || null
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
            form: entry.stats?.find(s => s.name === 'form')?.displayValue || ''
          },
          note: entry.note || null
        };
      });

      entries.sort((a, b) => a.rank - b.rank);

      return {
        groupName,
        entries
      };
    });

    return {
      leagueName: data.name || 'Official Standings',
      season: data.season || season,
      groups
    };
  } catch (error) {
    console.error(`Error fetching standings for ${leagueSlug}:`, error);
    return null;
  }
}
