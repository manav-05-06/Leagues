import { useState, useEffect, useMemo } from 'react';
import MatchCard from './MatchCard';

function sortMatches(list) {
  return [...list].sort((a, b) => {
    const statusOrder = { live: 0, upcoming: 1, finished: 2, postponed: 3 };
    const orderA = statusOrder[a.status] ?? 4;
    const orderB = statusOrder[b.status] ?? 4;
    if (orderA !== orderB) return orderA - orderB;

    const timeA = a.kickoff ? new Date(a.kickoff).getTime() : 0;
    const timeB = b.kickoff ? new Date(b.kickoff).getTime() : 0;

    if (a.status === 'upcoming') {
      return timeA - timeB; // Soonest upcoming first
    }
    return timeB - timeA; // Newest results first
  });
}

export default function MatchList({ matches = [], onMatchClick, onTeamClick, groupByLeague = false }) {
  const [visibleCount, setVisibleCount] = useState(60);

  // Reset pagination when the matches list or selection changes
  useEffect(() => {
    setVisibleCount(60);
  }, [matches]);

  const sortedMatches = useMemo(() => {
    return sortMatches(matches);
  }, [matches]);

  const groupedLeagues = useMemo(() => {
    if (!groupByLeague) return [];
    const map = new Map();
    matches.forEach(m => {
      const key = m.league || 'Other Competitions';
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          logo: m.leagueLogo,
          slug: m.leagueSlug,
          matches: [],
        });
      }
      map.get(key).matches.push(m);
    });

    const groups = Array.from(map.values());
    groups.forEach(g => {
      g.matches = sortMatches(g.matches);
    });
    return groups;
  }, [matches, groupByLeague]);

  if (!matches || matches.length === 0) {
    return (
      <div className="no-matches">
        <p>No matches found for this selection.</p>
      </div>
    );
  }

  // All Matches view: Grouped by competition
  if (groupByLeague) {
    return (
      <div className="league-groups-container">
        {groupedLeagues.map((group) => (
          <section key={group.name} className="league-group-section">
            <div className="league-group-header">
              <div className="league-group-title">
                {group.logo ? (
                  <img src={group.logo} alt={group.name} className="league-group-logo" />
                ) : (
                  <span className="league-group-icon">🏆</span>
                )}
                <h3>{group.name}</h3>
              </div>
              <span className="league-group-count">
                {group.matches.length} fixture{group.matches.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="match-grid">
              {group.matches.map((match) => (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  onClick={() => onMatchClick && onMatchClick(match)} 
                  onTeamClick={onTeamClick}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  // Single League view: Flat list with "Show more" button (+60)
  const displayMatches = sortedMatches.slice(0, visibleCount);

  return (
    <div className="match-grid">
      {displayMatches.map((match) => (
        <MatchCard 
          key={match.id} 
          match={match} 
          onClick={() => onMatchClick && onMatchClick(match)} 
          onTeamClick={onTeamClick}
        />
      ))}
      {visibleCount < sortedMatches.length && (
        <div className="show-more-container" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 0' }}>
          <button
            type="button"
            className="show-more-btn"
            onClick={() => setVisibleCount((prev) => prev + 60)}
          >
            Show more matches (+60)
          </button>
        </div>
      )}
    </div>
  );
}
