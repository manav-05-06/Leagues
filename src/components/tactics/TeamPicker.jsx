import { useState, useMemo, useEffect } from 'react';
import { useLeagueTeams } from '../../hooks/useTactics';
import { fetchLeagueTeams } from '../../api';

const POPULAR_LEAGUES = [
  { id: 'eng.1', name: 'Premier League' },
  { id: 'esp.1', name: 'La Liga' },
  { id: 'uefa.champions', name: 'Champions League' },
  { id: 'ita.1', name: 'Serie A' },
  { id: 'ger.1', name: 'Bundesliga' },
  { id: 'fra.1', name: 'Ligue 1' },
  { id: 'ksa.1', name: 'Saudi Pro League' },
  { id: 'usa.1', name: 'MLS' },
];

export default function TeamPicker({ isOpen, onClose, side, currentTeam, onSelectTeam }) {
  const [selectedLeague, setSelectedLeague] = useState(() => currentTeam?.league || 'eng.1');
  const [searchQuery, setSearchQuery] = useState('');
  const [crossLeagueMatches, setCrossLeagueMatches] = useState([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  // Sync selected league when modal opens or current team changes
  useEffect(() => {
    if (isOpen) {
      if (currentTeam?.league) {
        setSelectedLeague(currentTeam.league);
      }
      setSearchQuery('');
      setCrossLeagueMatches([]);
    }
  }, [isOpen, currentTeam?.league]);

  // Load teams for current league (cached for 24 hours)
  const { data: teams = [], isLoading } = useLeagueTeams(selectedLeague, {
    enabled: isOpen && Boolean(selectedLeague),
  });

  // Filter within current league
  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const q = searchQuery.toLowerCase().trim();
    return teams.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.short?.toLowerCase().includes(q)
    );
  }, [teams, searchQuery]);

  // Cross-league search if query doesn't yield many results in current league
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (q.length < 2) {
      setCrossLeagueMatches([]);
      setIsSearchingGlobal(false);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsSearchingGlobal(true);
      try {
        const otherLeagues = POPULAR_LEAGUES.filter((l) => l.id !== selectedLeague);
        const results = await Promise.all(
          otherLeagues.map(async (l) => {
            try {
              const leagueTeams = await fetchLeagueTeams(l.id);
              return leagueTeams
                .filter((t) => t.name.toLowerCase().includes(q) || t.short?.toLowerCase().includes(q))
                .map((t) => ({ ...t, league: l.id, leagueName: l.name }));
            } catch {
              return [];
            }
          })
        );
        if (!isCancelled) {
          setCrossLeagueMatches(results.flat());
        }
      } catch {
        if (!isCancelled) setCrossLeagueMatches([]);
      } finally {
        if (!isCancelled) setIsSearchingGlobal(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedLeague]);

  if (!isOpen) return null;

  const displaySide = side ? side.toUpperCase() : '';
  const currentTeamId = currentTeam?.teamId || currentTeam?.id;

  return (
    <div
      className="tactics-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-picker-title"
      onClick={onClose}
    >
      <div
        className="tactics-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tactics-modal-header">
          <div>
            <h3 id="team-picker-title" className="tactics-modal-title">
              Choose Team {displaySide}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
              Select a team to load their squad and starting XI
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="info-btn"
            style={{ fontSize: '20px' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Quick League Selector Pills */}
        <div className="tactics-quick-leagues">
          {POPULAR_LEAGUES.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`tactics-league-pill ${selectedLeague === l.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedLeague(l.id);
                setSearchQuery('');
              }}
            >
              {l.name}
            </button>
          ))}
        </div>

        {/* League Selector Dropdown for all competitions */}
        <div>
          <select
            value={selectedLeague}
            onChange={(e) => {
              setSelectedLeague(e.target.value);
              setSearchQuery('');
            }}
            className="tactics-formation-select"
            style={{ width: '100%', marginBottom: '8px' }}
          >
            <optgroup label="Top Domestic Leagues">
              <option value="eng.1">Premier League (England)</option>
              <option value="esp.1">La Liga (Spain)</option>
              <option value="ita.1">Serie A (Italy)</option>
              <option value="ger.1">Bundesliga (Germany)</option>
              <option value="fra.1">Ligue 1 (France)</option>
              <option value="ned.1">Eredivisie (Netherlands)</option>
              <option value="por.1">Primeira Liga (Portugal)</option>
            </optgroup>
            <optgroup label="European & Continental Cups">
              <option value="uefa.champions">UEFA Champions League</option>
              <option value="uefa.europa">UEFA Europa League</option>
              <option value="uefa.europa.conf">UEFA Conference League</option>
              <option value="conmebol.libertadores">Copa Libertadores</option>
              <option value="eng.fa">FA Cup</option>
              <option value="esp.copa_del_rey">Copa del Rey</option>
            </optgroup>
            <optgroup label="Global Leagues">
              <option value="ksa.1">Saudi Pro League (Saudi Arabia)</option>
              <option value="usa.1">MLS (USA)</option>
            </optgroup>
            <optgroup label="International Tournaments">
              <option value="fifa.world">FIFA World Cup</option>
              <option value="uefa.euro">UEFA Euro</option>
              <option value="uefa.nations">UEFA Nations League</option>
              <option value="fifa.friendly">International Friendlies</option>
            </optgroup>
          </select>

          {/* Search Box with Clear Button */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search team (e.g. Arsenal, Madrid, Al Nassr)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="tactics-search-input"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Teams Grid */}
        <div className="tactics-team-grid">
          {isLoading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              Loading teams...
            </div>
          ) : filteredTeams.length > 0 ? (
            filteredTeams.map((team) => {
              const isCurrent = String(team.id) === String(currentTeamId);
              return (
                <button
                  key={team.id}
                  type="button"
                  className={`tactics-team-card ${isCurrent ? 'active-team' : ''}`}
                  onClick={() => {
                    onSelectTeam(side, selectedLeague, team);
                    onClose();
                  }}
                  title={`Select ${team.name}`}
                >
                  {team.logo ? (
                    <img src={team.logo} alt={team.name} loading="lazy" />
                  ) : (
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: team.color || '#00ff87',
                      }}
                    />
                  )}
                  <span>{team.name}</span>
                </button>
              );
            })
          ) : crossLeagueMatches.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}>
              {isSearchingGlobal ? 'Searching other leagues...' : `No teams found matching "${searchQuery}" in this league.`}
            </div>
          ) : null}

          {/* Cross-League Matches Header & Cards if searched */}
          {crossLeagueMatches.length > 0 && (
            <>
              <div
                style={{
                  gridColumn: '1 / -1',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--accent-primary, #00ff87)',
                  padding: '8px 0 4px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                Matching Teams from other leagues
              </div>
              {crossLeagueMatches.map((team) => (
                <button
                  key={`${team.league}-${team.id}`}
                  type="button"
                  className="tactics-team-card"
                  onClick={() => {
                    onSelectTeam(side, team.league, team);
                    onClose();
                  }}
                  title={`Select ${team.name} (${team.leagueName})`}
                >
                  {team.logo ? (
                    <img src={team.logo} alt={team.name} loading="lazy" />
                  ) : (
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: team.color || '#00ff87',
                      }}
                    />
                  )}
                  <span>{team.name}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {team.leagueName}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
