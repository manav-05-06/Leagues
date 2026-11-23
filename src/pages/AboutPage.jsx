import { useDocumentHead } from '../hooks/useDocumentHead.js';
import { Target, Activity, Database, ShieldCheck } from 'lucide-react';

export default function AboutPage() {
  useDocumentHead({ kind: 'static', page: 'about' });

  return (
    <div className="about-page-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px 80px', color: '#f8fafc' }}>
      <header style={{ marginBottom: '40px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '12px', color: '#f8fafc' }}>
          About Matchday Arena
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.6 }}>
          Data sources, predictive models, and how expected goals (xG) and live win probabilities are calculated.
        </p>
      </header>

      {/* 1. What is Expected Goals (xG)? */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-primary, #00ff87)' }}>
          <Target size={22} />
          <span>How Expected Goals (xG) Works</span>
        </h2>
        <p style={{ lineHeight: 1.7, color: '#cbd5e1', marginBottom: '14px' }}>
          Expected Goals (xG) measures the probability of a shot resulting in a goal based on historical outcomes from thousands of similar attempts. Each shot is assigned an xG value between <strong>0.00</strong> (impossible goal) and <strong>1.00</strong> (certain goal).
        </p>
        <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '4px' }}>Distance & Angle</strong>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Distance to goal center and the visible target angle between the posts.</span>
          </div>
          <div>
            <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '4px' }}>Shot Type & Body Part</strong>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Headed attempts vs foot strikes; volleys vs controlled finishes.</span>
          </div>
          <div>
            <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '4px' }}>Phase of Play</strong>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Open-play build-up, fast counter-attacks, corners, free-kicks, and penalties (standardized 0.78 xG).</span>
          </div>
        </div>
      </section>

      {/* 2. Win Chances & Predictions */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-secondary, #00f2fe)' }}>
          <Activity size={22} />
          <span>Win Probability & Live Match Analytics</span>
        </h2>
        <p style={{ lineHeight: 1.7, color: '#cbd5e1', marginBottom: '14px' }}>
          Before kickoff, our pre-match model evaluates offensive ratings, defensive efficiencies, home advantage, and form over the last 15 fixtures to project win, draw, and loss chances. During live matches, the probability chart updates dynamically after every shot, goal, and card to reflect real-time game state.
        </p>
      </section>

      {/* 3. Data Sources & Transparency */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#f8fafc' }}>
          <Database size={22} />
          <span>Data Sources</span>
        </h2>
        <p style={{ lineHeight: 1.7, color: '#cbd5e1', marginBottom: '14px' }}>
          Fixtures, live match timelines, squad rosters, and official league standings are collected in real-time from public soccer feeds. Deep analytics (xG, shot maps, momentum timelines) are computed through our open-source Python analytics engine for 6 primary competitions:
        </p>
        <ul style={{ lineHeight: 1.8, color: '#94a3b8', paddingLeft: '20px' }}>
          <li><strong style={{ color: '#f8fafc' }}>English Premier League</strong></li>
          <li><strong style={{ color: '#f8fafc' }}>Spanish La Liga</strong></li>
          <li><strong style={{ color: '#f8fafc' }}>Italian Serie A</strong></li>
          <li><strong style={{ color: '#f8fafc' }}>German Bundesliga</strong></li>
          <li><strong style={{ color: '#f8fafc' }}>French Ligue 1</strong></li>
          <li><strong style={{ color: '#f8fafc' }}>UEFA Champions League</strong></li>
        </ul>
      </section>

      {/* 4. Commitment to Accuracy */}
      <section style={{ background: 'rgba(0, 255, 135, 0.05)', border: '1px solid rgba(0, 255, 135, 0.2)', borderRadius: '12px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <ShieldCheck size={24} color="var(--accent-primary, #00ff87)" />
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
            Open & Honest Analytics
          </h3>
        </div>
        <p style={{ lineHeight: 1.6, color: '#cbd5e1', margin: 0, fontSize: '14px' }}>
          Matchday Arena does not publish clickbait headlines or invent stats. When match lineups are predicted or auto-picked, they are clearly marked as such. Our models and calculations are calibrated to provide fans and analysts with honest, actionable football intelligence.
        </p>
      </section>
    </div>
  );
}
