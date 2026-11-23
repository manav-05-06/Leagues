import { useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Trophy, ClipboardList, Shield } from 'lucide-react';
import { fetchFullTeamDetails } from '../api.js';
import { teamFromEspn } from '../seo/normalize.js';
import { useDocumentHead } from '../hooks/useDocumentHead.js';
import { paths, slugify } from '../routes.js';
import { useAppStore } from '../store.js';

const POS_ORDER = [
  { key: 'G', label: 'Goalkeepers' },
  { key: 'D', label: 'Defenders' },
  { key: 'M', label: 'Midfielders' },
  { key: 'F', label: 'Forwards' },
];

export default function TeamPage() {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const setTacticsSeed = useAppStore((s) => s.setTacticsSeed);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['team-page', id],
    queryFn: () => fetchFullTeamDetails(id),
    staleTime: 60 * 60 * 1000,
    enabled: Boolean(id),
  });

  const normalized = useMemo(() => {
    if (!data?.team) return null;
    return teamFromEspn(data.team, data.schedule);
  }, [data]);

  useDocumentHead(normalized);

  // Canonical slug redirect if slug doesn't match
  useEffect(() => {
    if (normalized?.name) {
      const canonicalSlug = slugify(normalized.name);
      if (canonicalSlug && slug !== canonicalSlug) {
        navigate(paths.team({ id, name: normalized.name }), { replace: true });
      }
    }
  }, [normalized, id, slug, navigate]);

  if (isLoading) {
    return (
      <div className="content-layout" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="replay-spinner" />
      </div>
    );
  }

  if (isError || !data?.team) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
        <h2>Team Not Found</h2>
        <p style={{ marginTop: '8px' }}>Could not load details for this team.</p>
        <Link to={paths.home()} className="tactics-btn" style={{ display: 'inline-block', marginTop: '16px', textDecoration: 'none' }}>
          Back to Home
        </Link>
      </div>
    );
  }

  const team = data.team;
  const logo = team.logos?.[0]?.href;
  const leagueSlug = data.leagueSlug;
  const squad = data.squad || [];

  const groupedSquad = { G: [], D: [], M: [], F: [] };
  squad.forEach((player) => {
    const pos = player.pos || 'M';
    if (groupedSquad[pos]) groupedSquad[pos].push(player);
    else groupedSquad.M.push(player);
  });

  const handleOpenTactics = () => {
    setTacticsSeed({
      league: leagueSlug,
      home: { id: team.id, name: team.displayName, logo, color: team.color },
      away: { id: '', name: 'Opponent' },
    });
    navigate(paths.tactics());
  };

  return (
    <div className="team-page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(19, 21, 31, 0.95) 0%, rgba(9, 10, 17, 0.95) 100%)',
          border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.12))',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {logo ? (
            <img src={logo} alt={team.displayName} style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: team.color ? `#${team.color}` : '#00ff87' }} />
          )}
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#f8fafc', margin: 0 }}>
              {team.displayName}
            </h1>
            {normalized?.standingSummary && (
              <div style={{ color: 'var(--accent-primary, #00ff87)', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>
                {normalized.standingSummary}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            to={paths.league(leagueSlug)}
            className="tactics-btn"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Trophy size={14} />
            <span>Fixtures</span>
          </Link>
          <Link
            to={paths.table(leagueSlug)}
            className="tactics-btn"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Shield size={14} />
            <span>Table</span>
          </Link>
          <button
            type="button"
            className="tactics-btn tactics-btn-primary"
            onClick={handleOpenTactics}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ClipboardList size={14} />
            <span>Tactics Board</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {/* Next Match */}
        {normalized?.nextMatch && (
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '18px' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="var(--accent-primary)" />
              <span>Next Match</span>
            </h3>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
              vs {normalized.nextMatch.opponent}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {new Date(normalized.nextMatch.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}

        {/* Recent Form (Last 5) */}
        {normalized?.last5 && normalized.last5.length > 0 && (
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '18px' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Recent Results
            </h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {normalized.last5.map((m) => {
                const badgeBg = m.outcome === 'W' ? '#10b981' : m.outcome === 'D' ? '#6b7280' : '#ef4444';
                return (
                  <div
                    key={m.id}
                    title={`${m.opponent} (${m.score})`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ width: '18px', height: '18px', borderRadius: '4px', background: badgeBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px' }}>
                      {m.outcome}
                    </span>
                    <span style={{ color: '#cbd5e1' }}>{m.score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Squad List by Position */}
      <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', marginBottom: '16px' }}>
          Team Squad ({squad.length} Players)
        </h3>

        {POS_ORDER.map(({ key, label }) => {
          const players = groupedSquad[key] || [];
          if (players.length === 0) return null;

          return (
            <div key={key} style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-primary, #00ff87)', fontWeight: 700, marginBottom: '8px' }}>
                {label}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                {players.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#cbd5e1' }}>
                      {p.jersey || '-'}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
