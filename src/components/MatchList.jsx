import MatchCard from './MatchCard';

export default function MatchList({ matches, onMatchClick }) {
  if (!matches || matches.length === 0) {
    return (
      <div className="no-matches">
        <p>No matches found for this selection.</p>
      </div>
    );
  }

  // To prevent the browser from crashing, we'll slice the matches to a reasonable number
  // if they select "All Leagues" and "All Fixtures". 
  const displayMatches = matches.slice(0, 100);

  return (
    <div className="match-grid">
      {displayMatches.map(match => (
        <MatchCard 
          key={match.id} 
          match={match} 
          onClick={() => onMatchClick && onMatchClick(match)} 
        />
      ))}
      {matches.length > 100 && (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <p>Showing the first 100 matches. Please use the filters to narrow down the results.</p>
        </div>
      )}
    </div>
  );
}
