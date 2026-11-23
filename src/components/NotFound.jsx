import { Link } from 'react-router-dom';
import { Home, Trophy, ArrowRight } from 'lucide-react';
import { paths } from '../routes.js';
import { ALL_LEAGUES } from '../constants/leagues.js';
import { useDocumentHead } from '../hooks/useDocumentHead.js';

const FEATURED_LEAGUES = ALL_LEAGUES.filter((l) => l.id !== 'all').slice(0, 8);

export default function NotFound() {
  useDocumentHead({ kind: 'notfound' });

  return (
    <div className="not-found-container" style={{ padding: '60px 20px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: '72px', fontWeight: 900, color: 'var(--accent-primary, #00ff87)', lineHeight: 1, marginBottom: '16px' }}>
        404
      </div>
      <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px', color: '#f8fafc' }}>
        Page Not Found
      </h1>
      <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '15px', maxWidth: '480px', margin: '0 auto 28px' }}>
        The match, team or page you are looking for doesn&apos;t exist or may have been moved.
      </p>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '40px' }}>
        <Link
          to={paths.home()}
          className="tactics-btn tactics-btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', textDecoration: 'none' }}
        >
          <Home size={16} />
          <span>Back to Home</span>
        </Link>
        <Link
          to={paths.tactics()}
          className="tactics-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', textDecoration: 'none' }}
        >
          <span>Tactics Board</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      <div style={{ textAlign: 'left', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '24px' }}>
        <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #94a3b8)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Trophy size={15} color="var(--accent-primary, #00ff87)" />
          <span>Popular Competitions</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
          {FEATURED_LEAGUES.map((l) => (
            <Link
              key={l.id}
              to={paths.league(l.id)}
              className="tactics-league-pill"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              {l.logo && <img src={l.logo} alt={l.name} style={{ width: '18px', height: '18px', objectFit: 'contain' }} />}
              <span style={{ fontSize: '12px', fontWeight: 600 }}>{l.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
