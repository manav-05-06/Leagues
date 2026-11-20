import { useMemo } from 'react';
import InfoButton from './InfoButton';
import Legend from './Legend';
import { normalizePercentages } from './teamColors';
import { usePrematchPrediction } from '../../hooks/usePrematchPrediction';

const INFO_TEXT =
  "Our estimate of each result, based on the score, the time left, red cards and how good each team's chances have been. Before kickoff it uses each team's recent results.";

export default function PredictionCard({
  match,
  colors = { home: '#00ff87', away: '#00f2fe', draw: '#64748b' },
  onOpenAccuracy,
}) {
  const { data: prediction, isLoading, isError } = usePrematchPrediction(match);

  const home = match?.homeTeam || match?.home || {};
  const away = match?.awayTeam || match?.away || {};

  const winProb = prediction?.win_probability;

  const [pH, pD, pA] = useMemo(() => {
    if (!winProb) return [33, 34, 33];
    return normalizePercentages(winProb.home, winProb.draw, winProb.away);
  }, [winProb]);

  const topScores = useMemo(() => {
    if (!prediction?.top_scores) return [];
    return prediction.top_scores.slice(0, 3);
  }, [prediction]);

  if (isLoading) {
    return <div className="analytics-skeleton-card" style={{ minHeight: '180px' }} />;
  }

  if (isError || !prediction) {
    return (
      <div className="analytics-card">
        <div className="analytics-card-header">
          <h3 className="analytics-card-title">Prediction</h3>
          <InfoButton text={INFO_TEXT} />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '8px 0' }}>
          No prediction for this league yet
        </p>
      </div>
    );
  }

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <h3 className="analytics-card-title">Prediction</h3>
        <InfoButton text={INFO_TEXT} />
      </div>

      <Legend
        teamA={{ name: home.name || 'Home', color: colors.home }}
        teamB={{ name: away.name || 'Away', color: colors.away }}
        draw={{ name: 'Draw', color: colors.draw }}
      />

      {/* 3-Part Bar */}
      <div className="win-prob-bar-container">
        <div className="win-prob-track">
          <div
            className="win-prob-segment"
            style={{ width: `${pH}%`, backgroundColor: colors.home }}
          />
          <div
            className="win-prob-segment"
            style={{ width: `${pD}%`, backgroundColor: colors.draw }}
          />
          <div
            className="win-prob-segment"
            style={{ width: `${pA}%`, backgroundColor: colors.away }}
          />
        </div>

        {/* Labels under the bar */}
        <div className="win-prob-labels">
          <span className="win-prob-team-label">
            <span className="win-prob-dot" style={{ backgroundColor: colors.home }} />
            <span>{home.name || 'Home'} {pH}%</span>
          </span>
          <span className="win-prob-team-label" style={{ color: 'var(--text-muted)' }}>
            <span className="win-prob-dot" style={{ backgroundColor: colors.draw }} />
            <span>Draw {pD}%</span>
          </span>
          <span className="win-prob-team-label">
            <span className="win-prob-dot" style={{ backgroundColor: colors.away }} />
            <span>{away.name || 'Away'} {pA}%</span>
          </span>
        </div>
      </div>

      {/* Most likely scores chips */}
      {topScores.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '6px',
            }}
          >
            Most likely scores:
          </span>
          <div className="prematch-scores-chips">
            {topScores.map((s, idx) => (
              <span key={idx} className="score-chip">
                {s.home} - {s.away}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Link to accuracy */}
      {onOpenAccuracy && (
        <div style={{ marginTop: '4px' }}>
          <button
            type="button"
            onClick={onOpenAccuracy}
            className="accuracy-link-btn"
          >
            How accurate is this?
          </button>
        </div>
      )}
    </div>
  );
}
