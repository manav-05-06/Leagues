import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from 'recharts';

export default function WinProbChart({ history = [], match, onOpenAccuracy }) {
  if (!history || history.length < 2) return null;

  const home = match?.home || {};
  const away = match?.away || {};
  const homeColor = home.color && home.color !== '#000000' ? home.color : '#38bdf8';
  const awayColor = away.color && away.color !== '#000000' ? away.color : '#f43f5e';

  // Format data
  const chartData = history.map((pt) => ({
    minute: pt.minute,
    home: Math.round((pt.home || 0) * 100),
    draw: Math.round((pt.draw || 0) * 100),
    away: Math.round((pt.away || 0) * 100),
    goal: pt.goal,
    home_score: pt.home_score,
    away_score: pt.away_score,
  }));

  const goalMoments = chartData.filter((d) => d.goal);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Win Probability Timeline
        </h3>
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

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="homeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={homeColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={homeColor} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="awayGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={awayColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={awayColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="minute"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `${v}'`}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-2.5 text-xs shadow-xl backdrop-blur-md">
                    <div className="font-semibold text-slate-300 mb-1 border-b border-slate-800 pb-1 flex justify-between gap-4">
                      <span>Minute {label}&apos;</span>
                      <span className="font-mono text-white">
                        Score: {d?.home_score} - {d?.away_score}
                      </span>
                    </div>
                    <div className="space-y-1 font-mono">
                      <div className="flex justify-between gap-4" style={{ color: homeColor }}>
                        <span>{home.name || 'Home'}:</span>
                        <span className="font-bold">{d?.home}%</span>
                      </div>
                      <div className="flex justify-between gap-4 text-slate-400">
                        <span>Draw:</span>
                        <span className="font-bold">{d?.draw}%</span>
                      </div>
                      <div className="flex justify-between gap-4" style={{ color: awayColor }}>
                        <span>{away.name || 'Away'}:</span>
                        <span className="font-bold">{d?.away}%</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="home"
              name={home.name || 'Home'}
              stroke={homeColor}
              strokeWidth={2}
              fill="url(#homeGrad)"
            />
            <Area
              type="monotone"
              dataKey="away"
              name={away.name || 'Away'}
              stroke={awayColor}
              strokeWidth={2}
              fill="url(#awayGrad)"
            />
            {goalMoments.map((gm, idx) => (
              <ReferenceDot
                key={`goal-${idx}-${gm.minute}`}
                x={gm.minute}
                y={gm.goal === 'home' ? gm.home : gm.away}
                r={4.5}
                fill="#fbbf24"
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6 mt-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: homeColor }} />
          <span>{home.name || 'Home'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: awayColor }} />
          <span>{away.name || 'Away'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <span>⚽ Goal Scored</span>
        </div>
      </div>
    </div>
  );
}
