import { Link } from 'react-router-dom';
import { paths } from '../routes.js';
import { ALL_LEAGUES } from '../constants/leagues.js';

export default function SiteFooter() {
  const topLeagues = ALL_LEAGUES.filter((l) => l.category === 'top');
  const cupLeagues = ALL_LEAGUES.filter((l) => l.category === 'cups');
  const globalLeagues = ALL_LEAGUES.filter((l) => l.category === 'global' || l.category === 'international');

  return (
    <footer
      className="site-footer"
      style={{
        marginTop: '60px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(5, 12, 8, 0.95)',
        padding: '40px 20px 60px',
        color: 'var(--text-muted, #94a3b8)',
        fontSize: '13px',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px', marginBottom: '40px' }}>
          {/* Brand & Mission */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>⚽</span>
              <strong style={{ color: '#f8fafc', fontSize: '16px', fontWeight: 800 }}>Matchday Arena</strong>
            </div>
            <p style={{ lineHeight: 1.6, marginBottom: '16px', color: '#94a3b8' }}>
              Real-time football scores, expected goals (xG), shot maps, interactive tactics boards and 2D tracking replays across 19 global competitions.
            </p>
            <div style={{ display: 'flex', gap: '14px' }}>
              <Link to={paths.about()} style={{ color: 'var(--accent-primary, #00ff87)', textDecoration: 'none', fontWeight: 600 }}>
                About & Data
              </Link>
              <Link to={paths.tactics()} style={{ color: '#f8fafc', textDecoration: 'none' }}>
                Tactics Board
              </Link>
              <Link to={paths.replay()} style={{ color: '#f8fafc', textDecoration: 'none' }}>
                2D Replay
              </Link>
            </div>
          </div>

          {/* Top European Leagues */}
          <div>
            <h4 style={{ color: '#f8fafc', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
              Top Leagues
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topLeagues.map((l) => (
                <li key={l.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Link to={paths.league(l.id)} style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                    {l.name}
                  </Link>
                  <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>·</span>
                  <Link to={paths.table(l.id)} style={{ color: 'var(--accent-primary, #00ff87)', textDecoration: 'none', fontSize: '11px' }}>
                    Table
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cups & Continental */}
          <div>
            <h4 style={{ color: '#f8fafc', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
              Cups & Tournaments
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cupLeagues.map((l) => (
                <li key={l.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Link to={paths.league(l.id)} style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                    {l.name}
                  </Link>
                  <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>·</span>
                  <Link to={paths.table(l.id)} style={{ color: 'var(--accent-primary, #00ff87)', textDecoration: 'none', fontSize: '11px' }}>
                    Table
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Global Leagues */}
          <div>
            <h4 style={{ color: '#f8fafc', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
              Global & International
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {globalLeagues.map((l) => (
                <li key={l.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Link to={paths.league(l.id)} style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                    {l.name}
                  </Link>
                  <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>·</span>
                  <Link to={paths.table(l.id)} style={{ color: 'var(--accent-primary, #00ff87)', textDecoration: 'none', fontSize: '11px' }}>
                    Table
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Credits & Copyright */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px', alignItems: 'center', fontSize: '12px' }}>
          <span>© {new Date().getFullYear()} Matchday Arena. Open analytics & football data platform.</span>
          <span>Match scores and schedule data courtesy of ESPN. Analytics powered by Matchday Arena ML engine.</span>
        </div>
      </div>
    </footer>
  );
}
