import { useMemo } from 'react';
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
import InfoButton from './InfoButton';
import Legend from './Legend';
import { normalizePercentages } from './teamColors';

const INFO_TEXT =
  "Our estimate of each result, based on the score, the time left, red cards and how good each team's chances have been. Before kickoff it uses each team's recent results.";

export default function WinChanceCard({
  winProb = {},
  status = 'post',
  homeName = 'Home',
  awayName = 'Away',
  colors = { home: '#00ff87', away: '#00f2fe', draw: '#64748b' },
  updatedSecondsAgo = null,
}) {
  const isLive = status === 'in' || status === 'live';
  const isFinished = status === 'post' || status === 'finished';

  const title = isLive
    ? "Who's going to win?"
    : isFinished
      ? 'How the match swung'
      : 'Prediction';

  const [pH, pD, pA] = useMemo(() => {
    return normalizePercentages(winProb.home, winProb.draw, winProb.away);
  }, [winProb.home, winProb.draw, winProb.away]);

  // Next goal probabilities for live match
  const nextGoal = winProb.next_goal;
  const nextGoalParts = useMemo(() => {
    if (!nextGoal) return null;
    const [ngH, , ngA] = normalizePercentages(nextGoal.home, 0, nextGoal.away);
    const ngNone = Math.max(0, 100 - (ngH + ngA));
    const hShort = homeName.slice(0, 3).toUpperCase();
    const aShort = awayName.slice(0, 3).toUpperCase();
    return `Next goal: ${hShort} ${ngH}% · ${aShort} ${ngA}% · No more goals ${ngNone}%`;
  }, [nextGoal, homeName, awayName]);

  // Prepare minute-by-minute line chart data
  const history = winProb?.history;
  const chartData = useMemo(() => {
    if (!history || history.length < 2) return [];
    return history.map((pt) => {
      const [h, d, a] = normalizePercentages(pt.home, pt.draw, pt.away);
      return {
        minute: pt.minute,
        label: pt.label || `${pt.minute}'`,
        home: h,
        draw: d,
        away: a,
        goal: pt.goal,
        red_card: pt.red_card,
        score: `${pt.home_score ?? 0} - ${pt.away_score ?? 0}`,
      };
    });
  }, [history]);

  const goalPoints = useMemo(() => chartData.filter((d) => Boolean(d.goal)), [chartData]);
  const redCardPoints = useMemo(() => chartData.filter((d) => Boolean(d.red_card)), [chartData]);

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <h3 className="analytics-card-title">{title}</h3>
        <InfoButton text={INFO_TEXT} />
      </div>

      <span className="sr-only">
        Win chances: {homeName} {pH}%, Draw {pD}%, {awayName} {pA}%.
      </span>

      {/* 3-Part Probability Bar */}
      <div className="win-prob-bar-container">
        <div className="win-prob-track">
          <div
            className="win-prob-segment"
            style={{ width: `${pH}%`, backgroundColor: colors.home }}
            title={`${homeName}: ${pH}%`}
          />
          <div
            className="win-prob-segment"
            style={{ width: `${pD}%`, backgroundColor: colors.draw }}
            title={`Draw: ${pD}%`}
          />
          <div
            className="win-prob-segment"
            style={{ width: `${pA}%`, backgroundColor: colors.away }}
            title={`${awayName}: ${pA}%`}
          />
        </div>

        <div className="win-prob-labels">
          <span className="win-prob-team-label" style={{ color: colors.home }}>
            <span className="win-prob-dot" style={{ backgroundColor: colors.home }} />
            {homeName} {pH}%
          </span>
          <span style={{ color: colors.draw }}>
            Draw {pD}%
          </span>
          <span className="win-prob-team-label" style={{ color: colors.away }}>
            {awayName} {pA}%
            <span className="win-prob-dot" style={{ backgroundColor: colors.away }} />
          </span>
        </div>
      </div>

      {/* Live next-goal status */}
      {isLive && (nextGoalParts || updatedSecondsAgo != null) && (
        <div className="live-next-goal-row">
          <span>{nextGoalParts}</span>
          {updatedSecondsAgo != null && (
            <span>
              Updated {updatedSecondsAgo === 0 ? 'just now' : `${updatedSecondsAgo}s ago`}
            </span>
          )}
        </div>
      )}

      {/* History Line Chart */}
      {chartData.length >= 2 && (
        <div style={{ width: '100%', height: '180px', marginTop: '6px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis
                dataKey="minute"
                stroke="var(--text-muted, #94a3b8)"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => `${v}'`}
              />
              <YAxis
                domain={[0, 100]}
                stroke="var(--text-muted, #94a3b8)"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div
                      style={{
                        background: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                          paddingBottom: '4px',
                          marginBottom: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <span>{d.label}</span>
                        <span>Score: {d.score}</span>
                      </div>
                      <div style={{ color: colors.home }}>
                        {homeName}: {d.home}%
                      </div>
                      <div style={{ color: colors.draw }}>Draw: {d.draw}%</div>
                      <div style={{ color: colors.away }}>
                        {awayName}: {d.away}%
                      </div>
                    </div>
                  );
                }}
              />

              <Line
                type="monotone"
                dataKey="home"
                stroke={colors.home}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="draw"
                stroke={colors.draw}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="away"
                stroke={colors.away}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />

              {/* Goal markers */}
              {goalPoints.map((gp, i) => (
                <ReferenceDot
                  key={`goal-${i}`}
                  x={gp.minute}
                  y={gp.goal === 'home' ? gp.home : gp.away}
                  r={5}
                  fill="#ffffff"
                  stroke={gp.goal === 'home' ? colors.home : colors.away}
                  strokeWidth={2}
                />
              ))}

              {/* Red card markers */}
              {redCardPoints.map((rp, i) => (
                <ReferenceDot
                  key={`red-${i}`}
                  x={rp.minute}
                  y={rp.red_card === 'home' ? rp.home : rp.away}
                  r={5}
                  fill="#ff3366"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          <Legend
            homeName={homeName}
            homeColor={colors.home}
            awayName={awayName}
            awayColor={colors.away}
            showDraw={true}
            drawColor={colors.draw}
          />
        </div>
      )}
    </div>
  );
}
