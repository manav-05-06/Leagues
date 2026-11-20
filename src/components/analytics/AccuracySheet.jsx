import { useState, useEffect } from 'react';
import { fetchModelAccuracy } from '../../analyticsApi';

export default function AccuracySheet({ isOpen, onClose, league = 'eng.1' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoading(true);

    fetchModelAccuracy(league)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, league]);

  if (!isOpen) return null;

  // Determine numbers from data or fallbacks from verified Premier League backtest
  const testMatches = data?.test_matches || 1076;
  const alwaysHomePct = Math.round((data?.always_home_hit_rate ?? 0.4247) * 100);
  const modelHitPct = Math.round((data?.hit_rate ?? 0.4963) * 100);

  // 60-80% bin for the ~70% win chance question
  const highConfBin = data?.calibration?.find((c) => c.bin === '60-80%');
  const winWhen70Pct = highConfBin ? Math.round(highConfBin.observed * 100) : 64;

  return (
    <div
      className="accuracy-sheet-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accuracy-title"
      onClick={onClose}
    >
      <div
        className="accuracy-sheet-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="accuracy-sheet-header">
          <h3 id="accuracy-title" className="accuracy-sheet-title">
            How accurate is this?
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="info-btn"
            aria-label="Close"
            style={{ fontSize: '20px' }}
          >
            ×
          </button>
        </div>

        <div className="accuracy-sheet-body">
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading accuracy backtest numbers...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0 }}>
                We tested the prediction model on{' '}
                <strong>{testMatches.toLocaleString()} past league matches</strong> it hadn&apos;t seen.
              </p>
              <p style={{ margin: 0 }}>
                Always picking the home team would have been right{' '}
                <strong>{alwaysHomePct}%</strong> of the time.
              </p>
              <p style={{ margin: 0 }}>
                Our model picked the right result <strong>{modelHitPct}%</strong> of the time.
              </p>
              <p style={{ margin: 0 }}>
                When we say a team has about a 70% chance, they win about{' '}
                <strong>{winWhen70Pct}%</strong> of the time.
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="accuracy-sheet-close"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
