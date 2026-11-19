export default function ScorelineGrid({ prediction, onOpenAccuracy }) {
  if (!prediction) return null;

  const topScores = prediction.top_scores || [];
  const over25Pct = Math.round((prediction.over_25 || 0) * 100);
  const bttsPct = Math.round((prediction.btts || 0) * 100);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Scoreline & Goal Predictions
          </h3>
          <p className="text-xs text-slate-500">
            Dixon-Coles Poisson model simulation.
          </p>
        </div>
        {onOpenAccuracy && (
          <button
            type="button"
            onClick={onOpenAccuracy}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors cursor-pointer"
          >
            How accurate?
          </button>
        )}
      </div>

      {/* Top 5 Likely Scores */}
      {topScores.length > 0 && (
        <div className="mb-4">
          <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Most Likely Final Scores
          </span>
          <div className="grid grid-cols-5 gap-2">
            {topScores.map((s, idx) => (
              <div
                key={s.score || idx}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800/50 border border-slate-700/50"
              >
                <span className="text-sm font-bold font-mono text-slate-100">
                  {s.score}
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-semibold mt-0.5">
                  {Math.round((s.prob || 0) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Over 2.5 and BTTS */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        <div className="rounded-xl bg-slate-800/40 p-3 border border-slate-700/40">
          <div className="flex justify-between items-center mb-1 text-xs">
            <span className="text-slate-400">Over 2.5 Goals</span>
            <span className="font-mono font-bold text-sky-400">{over25Pct}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-700/60 rounded-full overflow-hidden">
            <div className="h-full bg-sky-400 rounded-full" style={{ width: `${over25Pct}%` }} />
          </div>
        </div>

        <div className="rounded-xl bg-slate-800/40 p-3 border border-slate-700/40">
          <div className="flex justify-between items-center mb-1 text-xs">
            <span className="text-slate-400">Both Teams Score</span>
            <span className="font-mono font-bold text-emerald-400">{bttsPct}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-700/60 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${bttsPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
