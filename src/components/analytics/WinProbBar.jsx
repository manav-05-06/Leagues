export default function WinProbBar({ winProb, match, onOpenAccuracy }) {
  if (!winProb) return null;

  const home = match?.home || {};
  const away = match?.away || {};
  const homeColor = home.color && home.color !== '#000000' ? home.color : '#38bdf8';
  const awayColor = away.color && away.color !== '#000000' ? away.color : '#f43f5e';

  const homePct = Math.round((winProb.home || 0) * 100);
  const drawPct = Math.round((winProb.draw || 0) * 100);
  const awayPct = Math.max(0, 100 - homePct - drawPct);

  const nextGoal = winProb.next_goal;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Win Probability
        </h3>
        {onOpenAccuracy && (
          <button
            type="button"
            onClick={onOpenAccuracy}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors cursor-pointer"
          >
            Model estimate · How accurate?
          </button>
        )}
      </div>

      {/* Probability Bar */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800 flex shadow-inner mb-3">
        <div
          className="h-full transition-all duration-500 relative"
          style={{ width: `${homePct}%`, backgroundColor: homeColor }}
          title={`Home Win: ${homePct}%`}
        />
        <div
          className="h-full transition-all duration-500 relative bg-slate-600"
          style={{ width: `${drawPct}%` }}
          title={`Draw: ${drawPct}%`}
        />
        <div
          className="h-full transition-all duration-500 relative"
          style={{ width: `${awayPct}%`, backgroundColor: awayColor }}
          title={`Away Win: ${awayPct}%`}
        />
      </div>

      {/* Probabilities Breakdown */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-slate-800/40 p-2 border border-slate-700/40">
          <span className="block text-[10px] text-slate-400 truncate">{home.name || 'Home'} Win</span>
          <span className="text-base font-bold font-mono" style={{ color: homeColor }}>
            {homePct}%
          </span>
        </div>
        <div className="rounded-lg bg-slate-800/40 p-2 border border-slate-700/40">
          <span className="block text-[10px] text-slate-400">Draw</span>
          <span className="text-base font-bold font-mono text-slate-300">
            {drawPct}%
          </span>
        </div>
        <div className="rounded-lg bg-slate-800/40 p-2 border border-slate-700/40">
          <span className="block text-[10px] text-slate-400 truncate">{away.name || 'Away'} Win</span>
          <span className="text-base font-bold font-mono" style={{ color: awayColor }}>
            {awayPct}%
          </span>
        </div>
      </div>

      {/* Next Goal Estimate if available */}
      {nextGoal && (
        <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px] font-medium text-slate-500">Next goal probability:</span>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span style={{ color: homeColor }}>{home.name || 'Home'} {Math.round(nextGoal.home * 100)}%</span>
            <span className="text-slate-500">·</span>
            <span style={{ color: awayColor }}>{away.name || 'Away'} {Math.round(nextGoal.away * 100)}%</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">No goal {Math.round(nextGoal.none * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
