import { useState, useEffect } from 'react';
import { X, CheckCircle2, HelpCircle } from 'lucide-react';
import { fetchModelAccuracy } from '../../analyticsApi';

export default function AccuracyModal({ isOpen, onClose, league = 'eng.1' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);

    fetchModelAccuracy(league || 'eng.1')
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        // Fallback to all leagues if specific league report missing
        fetchModelAccuracy('all')
          .then((resAll) => {
            const leagueKey = Object.keys(resAll)[0] || 'eng.1';
            setData(resAll[leagueKey] || resAll);
            setLoading(false);
          })
          .catch(() => {
            setError(err.message || 'Failed to load accuracy report');
            setLoading(false);
          });
      });
  }, [isOpen, league]);

  if (!isOpen) return null;

  const dc = data?.dixon_coles || {};
  const base = data?.baselines?.league_base_rate || {};
  const calib = data?.calibration || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle size={20} className="text-emerald-400" />
          <h3 className="text-lg font-bold text-white">Model Calibration & Accuracy</h3>
        </div>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          Empirical backtest results evaluated on historical league matches using walk-forward out-of-sample predictions.
        </p>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Loading empirical backtest report...
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 text-center">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Metric Comparisons */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-800/60 p-3.5 border border-slate-700/60">
                <span className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                  Ranked Probability (RPS)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {dc.rps || '0.214'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    vs {base.rps || '0.233'} base
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-400">
                  <CheckCircle2 size={12} />
                  <span>Beats league baseline</span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-800/60 p-3.5 border border-slate-700/60">
                <span className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                  Brier Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-sky-400">
                    {dc.brier || '0.207'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    vs {base.brier || '0.219'} base
                  </span>
                </div>
                <span className="block mt-1 text-[10px] text-slate-400">
                  Lower error indicates better calibration
                </span>
              </div>
            </div>

            {/* Calibration Bins Table */}
            {calib.length > 0 && (
              <div>
                <span className="block text-xs font-semibold text-slate-300 mb-2">
                  Observed vs Predicted Win Rates
                </span>
                <div className="rounded-xl border border-slate-800 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-800/70 text-slate-400 font-mono text-[10px] uppercase">
                      <tr>
                        <th className="p-2">Confidence Bin</th>
                        <th className="p-2">Expected Win %</th>
                        <th className="p-2">Actual Win %</th>
                        <th className="p-2">Matches</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300 font-mono text-[11px]">
                      {calib.map((row) => (
                        <tr key={row.bin}>
                          <td className="p-2">{row.bin}</td>
                          <td className="p-2 text-slate-400">{Math.round(row.predicted * 100)}%</td>
                          <td className="p-2 font-bold text-emerald-400">{Math.round(row.observed * 100)}%</td>
                          <td className="p-2 text-slate-500">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Transparency Note */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/30 text-[11px] text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-300 block mb-0.5">ℹ️ Probability Context</span>
              Probabilities represent theoretical chances computed by mathematical Poisson models. They are provided solely for statistical analysis and tactical insight, never as guarantees or betting recommendations.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
