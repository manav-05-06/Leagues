import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from 'recharts';

export default function XgSummary({ match, xg }) {
  if (!xg) return null;

  const home = match?.home || {};
  const away = match?.away || {};
  const homeColor = home.color && home.color !== '#000000' ? home.color : '#38bdf8';
  const awayColor = away.color && away.color !== '#000000' ? away.color : '#f43f5e';

  const homeXg = Number(xg.home ?? 0);
  const awayXg = Number(xg.away ?? 0);
  const totalXg = homeXg + awayXg;
  const homePercent = totalXg > 0 ? (homeXg / totalXg) * 100 : 50;

  // Process timeline data for step chart
  const timelineData = (xg.timeline || []).map((pt) => ({
    minute: pt.minute,
    home: Number(pt.home),
    away: Number(pt.away),
    goal: pt.goal,
    shooter: pt.shooter,
  }));

  // Identify goal moments for reference markers
  const goalMarkers = timelineData.filter((pt) => pt.goal);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Expected Goals (xG) Summary
        </h3>
        <span className="text-xs text-slate-500 font-mono">Statistical chance of scoring</span>
      </div>

      {/* Comparison Cards */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Home */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-3">
            {home.logo ? (
              <img src={home.logo} alt={home.name} className="w-8 h-8 object-contain" />
            ) : (
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: homeColor }}
              />
            )}
            <div>
              <p className="font-semibold text-slate-200 text-sm">{home.name || 'Home'}</p>
              <p className="text-xs text-slate-400">Goals: <span className="font-bold text-white">{home.score ?? 0}</span></p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold font-mono text-sky-400">
              {homeXg.toFixed(2)}
            </span>
            <span className="block text-[10px] text-slate-500 uppercase tracking-wider">xG</span>
          </div>
        </div>

        {/* Away */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-3">
            {away.logo ? (
              <img src={away.logo} alt={away.name} className="w-8 h-8 object-contain" />
            ) : (
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: awayColor }}
              />
            )}
            <div>
              <p className="font-semibold text-slate-200 text-sm">{away.name || 'Away'}</p>
              <p className="text-xs text-slate-400">Goals: <span className="font-bold text-white">{away.score ?? 0}</span></p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold font-mono text-rose-400">
              {awayXg.toFixed(2)}
            </span>
            <span className="block text-[10px] text-slate-500 uppercase tracking-wider">xG</span>
          </div>
        </div>
      </div>

      {/* xG Proportion Bar */}
      <div className="mb-6">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800 flex">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${homePercent}%`, backgroundColor: homeColor }}
          />
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${100 - homePercent}%`, backgroundColor: awayColor }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[11px] font-mono text-slate-400">
          <span>{homePercent.toFixed(0)}%</span>
          <span>{(100 - homePercent).toFixed(0)}%</span>
        </div>
      </div>

      {/* Cumulative Step Chart */}
      {timelineData.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
            <span>Cumulative xG Timeline</span>
            <span className="text-[11px] text-slate-500 font-normal">⚽ indicates goal scored</span>
          </h4>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timelineData}
                margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="minute"
                  domain={[0, 'dataMax']}
                  tickLine={false}
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `${val}'`}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  allowDecimals={true}
                  tickFormatter={(val) => val.toFixed(1)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const point = payload[0]?.payload;
                    return (
                      <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-2.5 text-xs shadow-xl backdrop-blur-md">
                        <div className="font-semibold text-slate-300 mb-1 border-b border-slate-800 pb-1 flex justify-between">
                          <span>Minute {label}&apos;</span>
                          {point?.goal && (
                            <span className="text-amber-400 font-bold">⚽ Goal! ({point.shooter})</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: homeColor }} />
                              {home.name || 'Home'}
                            </span>
                            <span className="font-mono font-bold text-slate-200">
                              {point?.home?.toFixed(2)} xG
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: awayColor }} />
                              {away.name || 'Away'}
                            </span>
                            <span className="font-mono font-bold text-slate-200">
                              {point?.away?.toFixed(2)} xG
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Line
                  type="stepAfter"
                  dataKey="home"
                  name={home.name || 'Home'}
                  stroke={homeColor}
                  strokeWidth={2.2}
                  dot={false}
                />
                <Line
                  type="stepAfter"
                  dataKey="away"
                  name={away.name || 'Away'}
                  stroke={awayColor}
                  strokeWidth={2.2}
                  dot={false}
                />
                {goalMarkers.map((gm, idx) => (
                  <ReferenceDot
                    key={`goal-${idx}-${gm.minute}`}
                    x={gm.minute}
                    y={gm.goal === 'home' ? gm.home : gm.away}
                    r={5}
                    fill="#fbbf24"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
