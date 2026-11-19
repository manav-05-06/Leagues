import { useState, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';

export default function PlayerTable({ players = [], match, onPlayerClick }) {
  const [teamFilter, setTeamFilter] = useState('all');
  const [sortField, setSortField] = useState('xg');
  const [sortAsc, setSortAsc] = useState(false);

  const home = match?.home || {};
  const away = match?.away || {};

  // Filter players
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (teamFilter === 'all') return true;
      return String(p.team_id) === String(teamFilter);
    });
  }, [players, teamFilter]);

  // Sort players
  const sortedPlayers = useMemo(() => {
    const list = [...filteredPlayers];
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      aVal = Number(aVal || 0);
      bVal = Number(bVal || 0);
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [filteredPlayers, sortField, sortAsc]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  if (!players || players.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Player Tactical Statistics
          </h3>
          <p className="text-xs text-slate-500">
            xG, shooting impact, discipline, and goalkeeper goals prevented.
          </p>
        </div>

        {/* Team Filter */}
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
        >
          <option value="all">All Players</option>
          {home.id && <option value={home.id}>{home.name || 'Home'}</option>}
          {away.id && <option value={away.id}>{away.name || 'Away'}</option>}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800/80 text-[10px] uppercase font-mono text-slate-400 border-b border-slate-700/60">
            <tr>
              <th
                className="p-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  <span>Player</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th className="p-3">Pos</th>
              <th
                className="p-3 cursor-pointer hover:text-white text-right"
                onClick={() => handleSort('xg')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>xG</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th
                className="p-3 cursor-pointer hover:text-white text-right"
                onClick={() => handleSort('shots')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Shots</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th
                className="p-3 cursor-pointer hover:text-white text-right"
                onClick={() => handleSort('shots_on_target')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>On Target</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th
                className="p-3 cursor-pointer hover:text-white text-right"
                onClick={() => handleSort('goals')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Goals</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th
                className="p-3 cursor-pointer hover:text-white text-right"
                onClick={() => handleSort('assists')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Assists</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th
                className="p-3 cursor-pointer hover:text-white text-right"
                onClick={() => handleSort('fouls_won')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Fouls Won</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
              <th
                className="p-3 cursor-pointer hover:text-white text-right"
                onClick={() => handleSort('fouls_committed')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Fouls Com</span>
                  <ArrowUpDown size={11} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono">
            {sortedPlayers.map((p) => {
              const isHomeTeam = String(p.team_id) === String(home.id);
              const teamColor = isHomeTeam
                ? (home.color || '#38bdf8')
                : (away.color || '#f43f5e');

              return (
                <tr
                  key={p.id}
                  onClick={() =>
                    onPlayerClick &&
                    onPlayerClick(p.id, p.team_id, match?.leagueSlug || 'eng.1')
                  }
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  <td className="p-3 font-sans">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-mono px-1 rounded"
                        style={{ color: teamColor, backgroundColor: 'rgba(255,255,255,0.05)' }}
                      >
                        #{p.jersey || '•'}
                      </span>
                      <span className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                        {p.name}
                      </span>
                      {p.starter && (
                        <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-500 uppercase">
                          XI
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 font-mono text-slate-400 text-[11px]">
                    {p.position_group}
                  </td>
                  <td className="p-3 text-right font-bold text-emerald-400">
                    {p.xg > 0 ? p.xg.toFixed(2) : '-'}
                  </td>
                  <td className="p-3 text-right text-slate-200">
                    {p.shots > 0 ? p.shots : '-'}
                  </td>
                  <td className="p-3 text-right text-sky-400">
                    {p.shots_on_target > 0 ? p.shots_on_target : '-'}
                  </td>
                  <td className="p-3 text-right font-bold text-amber-400">
                    {p.goals > 0 ? p.goals : '-'}
                  </td>
                  <td className="p-3 text-right text-slate-200">
                    {p.assists > 0 ? p.assists : '-'}
                  </td>
                  <td className="p-3 text-right text-slate-300">
                    {p.fouls_won > 0 ? p.fouls_won : '-'}
                  </td>
                  <td className="p-3 text-right text-slate-400">
                    {p.fouls_committed > 0 ? p.fouls_committed : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
