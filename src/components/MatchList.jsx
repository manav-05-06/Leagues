import MatchCard from './MatchCard';

export default function MatchList({ matches, onMatchClick }) {
  if (!matches || matches.length === 0) {
    return (
      <div className="no-matches">
        <p>No matches found for this selection.</p>
      </div>
    );
  }

  return (
    <div className="match-grid">
      {matches.map(match => (
        <MatchCard 
          key={match.id} 
          match={match} 
          onClick={() => onMatchClick && onMatchClick(match)} 
        />
      ))}
    </div>
  );
}
