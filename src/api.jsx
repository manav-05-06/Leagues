export async function fetchEspnMatches(leagueCode = 'all', season = '2024') {
  try {
    // ESPN scoreboard API uses 'dates' with a range (YYYYMMDD-YYYYMMDD) instead of 'season'
    const startDate = `${season}0801`;
    const endDate = `${parseInt(season) + 1}0531`;
    const datesParam = `${startDate}-${endDate}`;

    const allEndpoints = {
      'eng.1': `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${datesParam}&limit=500`,
      'esp.1': `https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard?dates=${datesParam}&limit=500`,
      'ger.1': `https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/scoreboard?dates=${datesParam}&limit=500`
    };

    const endpoints = leagueCode === 'all' 
      ? Object.values(allEndpoints)
      : [allEndpoints[leagueCode]];

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

    for (const data of dataArr) {
      if (!data || !data.events) continue;

      const leagueName = data.leagues?.[0]?.name || 'Unknown League';

      const mappedEvents = data.events.map((event) => {
        const competition = event.competitions[0];
        const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home');
        const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away');
        
        const statusState = competition.status.type.state;
        const statusDetail = competition.status.type.detail;

        return {
          id: event.id,
          league: leagueName,
          homeTeam: { 
            name: homeCompetitor?.team?.name || 'Unknown', 
            logo: (homeCompetitor?.team?.logo) ? <img src={homeCompetitor.team.logo} alt="logo" style={{width: '100%', height: '100%', objectFit: 'contain'}} /> : '⚽' 
          },
          awayTeam: { 
            name: awayCompetitor?.team?.name || 'Unknown', 
            logo: (awayCompetitor?.team?.logo) ? <img src={awayCompetitor.team.logo} alt="logo" style={{width: '100%', height: '100%', objectFit: 'contain'}} /> : '⚽' 
          },
          status: statusState === 'in' ? 'live' : (statusState === 'post' ? 'finished' : 'upcoming'),
          score: statusState !== 'pre' ? { 
            home: homeCompetitor?.score || '0', 
            away: awayCompetitor?.score || '0' 
          } : null,
          time: statusDetail,
          details: competition.details || [],
          homeTeamId: homeCompetitor?.team?.id,
          awayTeamId: awayCompetitor?.team?.id,
          leagueSlug: data.leagues?.[0]?.slug || leagueCode
        };
      });

      allMatches = [...allMatches, ...mappedEvents];
    }
    
    return allMatches;
  } catch (error) {
    console.error("Error fetching ESPN matches:", error);
    throw error;
  }
}

export async function fetchMatchSummary(matchId) {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/summary?event=${matchId}`;
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

export async function fetchPlayerProfile(playerId) {
  try {
    const url = `https://site.api.espn.com/apis/common/v3/sports/soccer/eng.1/athletes/${playerId}`;
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
