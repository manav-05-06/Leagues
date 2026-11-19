import { ShieldCheck, Info } from 'lucide-react';

export default function KeeperCard({ rosters = [], match }) {
  if (!rosters || rosters.length === 0) return null;

  // Extract starting goalkeepers
  const keepers = [];
  rosters.forEach((r) => {
    const gk = r.starters.find(
      (p) => p.position_group === 'G' || p.formation_place === 1
    );
    if (gk) {
      keepers.push({ ...gk, teamName: r.team_name, teamId: r.team_id });
    }
  });

  if (keepers.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Goalkeeper Impact · Goals Prevented
          </h3>
        </div>
        <div className="group relative cursor-pointer text-slate-500 hover:text-slate-300">
          <Info size={15} />
          <div className="absolute right-0 bottom-full mb-2 hidden w-64 rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-[11px] text-slate-400 shadow-2xl group-hover:block z-30 leading-relaxed">
            <strong className="text-slate-200 block mb-0.5">Goals Prevented:</strong>
            Total xG of on-target shots faced minus goals conceded. A positive rating indicates above-average shot-stopping performance.
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Evaluates shot-stopping performance relative to post-shot expected goal quality.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {keepers.map((keeper) => {
          const isHome = match?.home?.id === keeper.teamId;
          const teamColor = isHome
            ? (match?.home?.color || '#38bdf8')
            : (match?.away?.color || '#f43f5e');

          const gp = keeper.goals_prevented ?? 0.0;
          const isPositive = gp > 0;
          const gpFormatted = `${isPositive ? '+' : ''}${gp.toFixed(2)}`;

          return (
            <div
              key={keeper.id}
              className="flex flex-col justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/50"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl font-bold font-mono text-sm border shadow-sm"
                    style={{
                      borderColor: teamColor,
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      color: teamColor,
                    }}
                  >
                    #{keeper.jersey || '1'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200 leading-tight">
                      {keeper.name}
                    </h4>
                    <span className="text-xs text-slate-400">{keeper.teamName}</span>
                  </div>
                </div>

                {/* Goals Prevented Pill */}
                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                      isPositive
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : gp < 0
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                        : 'border-slate-700 bg-slate-800 text-slate-300'
                    }`}
                  >
                    {gpFormatted}
                  </span>
                  <span className="block text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">
                    Prevented
                  </span>
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/40 text-center text-xs">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase">Saves</span>
                  <span className="font-bold text-slate-200 font-mono">{keeper.saves}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase">Conceded</span>
                  <span className="font-bold text-slate-200 font-mono">{keeper.goals_conceded}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase">xG Faced</span>
                  <span className="font-bold text-sky-400 font-mono">
                    {keeper.shots_faced_xg?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
