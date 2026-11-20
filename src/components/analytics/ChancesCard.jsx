import { useState, useMemo } from 'react';
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
import { ChevronDown, ChevronUp } from 'lucide-react';
import InfoButton from './InfoButton';
import Legend from './Legend';

const INFO_TEXT =
  "Expected goals (xG) measures how good a chance was. A shot worth 0.3 xG goes in about 3 times out of 10. Add up a team's shots to see how many goals their chances were worth.";

export default function ChancesCard({
  xg = {},
  homeName = 'Home',
  awayName = 'Away',
  homeScore = 0,
  awayScore = 0,
  colors = { home: '#00ff87', away: '#00f2fe' },
}) {
  const [showTimeline, setShowTimeline] = useState(false);

  const homeXg = Number(xg.home ?? 0);
  const awayXg = Number(xg.away ?? 0);
  const maxXg = Math.max(homeXg, awayXg, 1.0);

  const homeBarPct = Math.min(100, Math.round((homeXg / maxXg) * 100));
  const awayBarPct = Math.min(100, Math.round((awayXg / maxXg) * 100));

  // Auto-written 1-line plain sentence
  const reading = useMemo(() => {
    const hRound = Math.round(homeXg);
    const aRound = Math.round(awayXg);

    if (homeScore > awayScore) {
      if (awayXg > homeXg && awayXg - homeXg >= 0.3) {
        return `${awayName}'s chances were worth about ${aRound} goal${aRound === 1 ? '' : 's'}. ${homeName} scored with fewer.`;
      }
      return `${homeName}'s chances were worth about ${hRound} goal${hRound === 1 ? '' : 's'}. They took theirs.`;
    }
    if (awayScore > homeScore) {
      if (homeXg > awayXg && homeXg - awayXg >= 0.3) {
        return `${homeName}'s chances were worth about ${hRound} goal${hRound === 1 ? '' : 's'}. ${awayName} scored with fewer.`;
      }
      return `${awayName}'s chances were worth about ${aRound} goal${aRound === 1 ? '' : 's'}. They took theirs.`;
    }
    if (Math.abs(homeXg - awayXg) < 0.3) {
      return `Both teams created chances worth about ${hRound || aRound || 1} goal${(hRound || 1) === 1 ? '' : 's'}.`;
    }
    const higherTeam = homeXg > awayXg ? homeName : awayName;
    const higherVal = homeXg > awayXg ? hRound : aRound;
    return `${higherTeam}'s chances were worth about ${higherVal} goal${higherVal === 1 ? '' : 's'}.`;
  }, [homeXg, awayXg, homeScore, awayScore, homeName, awayName]);

  // Timeline step chart data
  const timelineData = useMemo(() => {
    if (!xg.timeline || xg.timeline.length < 2) return [];
    return xg.timeline.map((pt) => ({
      minute: pt.minute,
      home: Number(pt.home),
      away: Number(pt.away),
      goal: pt.goal,
      shooter: pt.shooter,
    }));
  }, [xg.timeline]);

  const goalMarkers = useMemo(
    () => timelineData.filter((pt) => Boolean(pt.goal)),
    [timelineData]
  );

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <h3 className="analytics-card-title">Chances created (expected goals)</h3>
        <InfoButton text={INFO_TEXT} />
      </div>

      <span className="sr-only">
        Expected goals: {homeName} {homeXg.toFixed(1)} ({homeScore} goals), {awayName}{' '}
        {awayXg.toFixed(1)} ({awayScore} goals). {reading}
      </span>

      <div className="chances-summary-row">
        {/* Home Row */}
        <div className="chances-team-row">
          <span className="chances-team-name">{homeName}</span>
          <span className="chances-xg-value" style={{ color: colors.home }}>
            {homeXg.toFixed(1)}
          </span>
          <div className="chances-bar-track">
            <div
              className="chances-bar-fill"
              style={{ width: `${homeBarPct}%`, backgroundColor: colors.home }}
            />
          </div>
          <span className="chances-goals-count">
            {homeScore} {homeScore === 1 ? 'goal' : 'goals'}
          </span>
        </div>

        {/* Away Row */}
        <div className="chances-team-row">
          <span className="chances-team-name">{awayName}</span>
          <span className="chances-xg-value" style={{ color: colors.away }}>
            {awayXg.toFixed(1)}
          </span>
          <div className="chances-bar-track">
            <div
              className="chances-bar-fill"
              style={{ width: `${awayBarPct}%`, backgroundColor: colors.away }}
            />
          </div>
          <span className="chances-goals-count">
            {awayScore} {awayScore === 1 ? 'goal' : 'goals'}
          </span>
        </div>
      </div>

      <p className="chances-reading-text">{reading}</p>

      {timelineData.length >= 2 && (
        <div>
          <button
            type="button"
            className="chances-expand-btn"
            onClick={() => setShowTimeline((prev) => !prev)}
            aria-expanded={showTimeline}
          >
            {showTimeline ? (
              <>
                Hide build-up <ChevronUp size={14} />
              </>
            ) : (
              <>
                Show how it built up <ChevronDown size={14} />
              </>
            )}
          </button>

          {showTimeline && (
            <div style={{ width: '100%', height: '180px', marginTop: '12px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={timelineData}
                  margin={{ top: 12, right: 12, left: -22, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis
                    dataKey="minute"
                    stroke="var(--text-muted, #94a3b8)"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `${v}'`}
                  />
                  <YAxis
                    stroke="var(--text-muted, #94a3b8)"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => Number(v).toFixed(1)}
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
                              marginBottom: '4px',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                              paddingBottom: '3px',
                            }}
                          >
                            Minute {d.minute}&apos;
                            {d.goal && ` · ⚽ ${d.shooter || 'Goal'}`}
                          </div>
                          <div style={{ color: colors.home }}>
                            {homeName}: {Number(d.home).toFixed(2)} xG
                          </div>
                          <div style={{ color: colors.away }}>
                            {awayName}: {Number(d.away).toFixed(2)} xG
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="home"
                    stroke={colors.home}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="away"
                    stroke={colors.away}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />

                  {goalMarkers.map((gm, i) => (
                    <ReferenceDot
                      key={`goal-marker-${i}`}
                      x={gm.minute}
                      y={gm.goal === 'home' ? gm.home : gm.away}
                      r={5}
                      fill="#ffffff"
                      stroke={gm.goal === 'home' ? colors.home : colors.away}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <Legend
                homeName={homeName}
                homeColor={colors.home}
                awayName={awayName}
                awayColor={colors.away}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
