import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

export default function MomentumWave({ momentum = [], match }) {
  if (!momentum || momentum.length < 2) return null;

  const home = match?.home || {};
  const away = match?.away || {};
  const homeColor = home.color && home.color !== '#000000' ? home.color : '#38bdf8';
  const awayColor = away.color && away.color !== '#000000' ? away.color : '#f43f5e';

  // Separate into home dominance (>0) and away dominance (<0) for visual area fills
  const chartData = momentum.map((pt) => ({
    minute: pt.minute,
    val: pt.momentum,
    homeVal: pt.momentum > 0 ? pt.momentum : 0,
    awayVal: pt.momentum < 0 ? pt.momentum : 0,
  }));

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Attacking Momentum Wave
        </h3>
        <span className="text-[11px] text-slate-500 font-mono">Rolling 5-min pressure</span>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Weights shot quality (xG), corner kicks, and final-third fouls won.
      </p>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="homeMomentum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={homeColor} stopOpacity={0.6} />
                <stop offset="95%" stopColor={homeColor} stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="awayMomentum" x1="0" y1="1" x2="0" y2="0">
                <stop offset="5%" stopColor={awayColor} stopOpacity={0.6} />
                <stop offset="95%" stopColor={awayColor} stopOpacity={0.1} />
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
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              domain={[-0.8, 0.8]}
              tickFormatter={(v) => Math.abs(v).toFixed(1)}
            />
            <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0]?.payload;
                const isHomeDominant = d?.val > 0;
                return (
                  <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-2 text-xs shadow-xl backdrop-blur-md">
                    <div className="font-semibold text-slate-300 mb-1 border-b border-slate-800 pb-1">
                      Minute {label}&apos;
                    </div>
                    <div className="font-mono">
                      {isHomeDominant ? (
                        <span style={{ color: homeColor }}>
                          {home.name || 'Home'} Dominating (+{Math.abs(d.val).toFixed(2)})
                        </span>
                      ) : d?.val < 0 ? (
                        <span style={{ color: awayColor }}>
                          {away.name || 'Away'} Dominating (+{Math.abs(d.val).toFixed(2)})
                        </span>
                      ) : (
                        <span className="text-slate-400">Even Pressure (0.00)</span>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="homeVal"
              name="Home Pressure"
              stroke={homeColor}
              strokeWidth={1.5}
              fill="url(#homeMomentum)"
            />
            <Area
              type="monotone"
              dataKey="awayVal"
              name="Away Pressure"
              stroke={awayColor}
              strokeWidth={1.5}
              fill="url(#awayMomentum)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-2">
        <span className="flex items-center gap-1.5" style={{ color: homeColor }}>
          ▲ {home.name || 'Home'} Attacking
        </span>
        <span className="text-slate-500 font-mono">0.0 (Neutral)</span>
        <span className="flex items-center gap-1.5" style={{ color: awayColor }}>
          ▼ {away.name || 'Away'} Attacking
        </span>
      </div>
    </div>
  );
}
