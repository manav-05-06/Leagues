import { ImageResponse } from '@vercel/og';
import fs from 'node:fs';
import path from 'node:path';
import { matchFromSummary } from '../../src/seo/normalize.js';
import { LEAGUE_SEO_DATA, fromUrlName, COVERED_LEAGUES } from '../../src/seo/leagues.js';
import { isValidEspnId } from '../../src/seo/site.js';

export const config = {
  runtime: 'nodejs',
};

const USER_AGENT = 'LeaguesMatchAnalytics/1.0 (Educational open analytics platform)';

function darkenColor(hex, factor = 0.4) {
  if (!hex) return '#0d1319';
  let c = hex.replace(/^#/, '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return '#0d1319';
  const r = Math.round(((num >> 16) & 255) * factor);
  const g = Math.round(((num >> 8) & 255) * factor);
  const b = Math.round((num & 255) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

async function loadLogoDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get('content-type') || 'image/png';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

let fontBuffer = null;
function getFont() {
  if (!fontBuffer) {
    const fontPath = path.join(process.cwd(), 'api', 'seo', 'fonts', 'BarlowSemiCondensed-Bold.ttf');
    if (fs.existsSync(fontPath)) {
      fontBuffer = fs.readFileSync(fontPath);
    }
  }
  return fontBuffer;
}

export default async function handler(req, res) {
  const font = getFont();
  const fontOptions = font
    ? [
        {
          name: 'Barlow Semi Condensed',
          data: font,
          weight: 700,
          style: 'normal',
        },
      ]
    : [];

  const { kind: requestedKind = 'site', file = 'default' } = req.query;
  const cleanId = String(file).replace(/\.png$/, '');
  // Match and team images need a numeric ESPN id; anything else gets the site image.
  const kind = (requestedKind === 'match' || requestedKind === 'team') && !isValidEspnId(cleanId)
    ? 'site'
    : requestedKind;

  let cacheHeader = 'public, s-maxage=86400, stale-while-revalidate=86400';
  let jsxElement = null;

  try {
    if (kind === 'match') {
      const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${cleanId}`;
      const summaryRes = await fetch(summaryUrl, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(3000),
      });

      if (!summaryRes.ok) {
        throw new Error('Match not found');
      }

      const summary = await summaryRes.json();
      const parsed = matchFromSummary(summary);
      if (!parsed) throw new Error('Could not parse match');

      const isLive = parsed.status === 'live';
      const isFinished = parsed.status === 'finished';

      if (isFinished) {
        cacheHeader = 'public, s-maxage=604800, immutable';
      } else if (isLive) {
        cacheHeader = 'public, s-maxage=60';
      } else {
        cacheHeader = 'public, s-maxage=3600';
      }

      const homeColor = darkenColor(parsed.home.color || '1e293b');
      const awayColor = darkenColor(parsed.away.color || '0f172a');

      // Fetch logos in parallel
      const [homeLogoData, awayLogoData] = await Promise.all([
        loadLogoDataUrl(parsed.home.logo),
        loadLogoDataUrl(parsed.away.logo),
      ]);

      // Check xG if covered league
      let xgText = null;
      const analyticsUrl = process.env.ANALYTICS_API_URL;
      if (COVERED_LEAGUES.includes(parsed.league.espnSlug) && analyticsUrl && (isFinished || isLive)) {
        try {
          const xgRes = await fetch(`${analyticsUrl}/matches/${cleanId}/analytics`, {
            headers: { 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(1200),
          });
          if (xgRes.ok) {
            const xgData = await xgRes.json();
            const xg = xgData?.xg;
            if (Number.isFinite(xg?.home) && Number.isFinite(xg?.away)) {
              xgText = `xG ${xg.home.toFixed(1)} – ${xg.away.toFixed(1)}`;
            }
          }
        } catch {
          // ignore
        }
      }

      let statusLine = 'UPCOMING';
      if (isLive) {
        statusLine = `LIVE · ${parsed.minute || "In Progress"}`;
      } else if (isFinished) {
        statusLine = 'FULL TIME';
      } else if (parsed.kickoff) {
        const d = new Date(parsed.kickoff);
        statusLine = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      }

      jsxElement = (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px 64px',
            background: `linear-gradient(135deg, ${homeColor} 0%, #06090e 50%, ${awayColor} 100%)`,
            fontFamily: font ? 'Barlow Semi Condensed' : 'sans-serif',
            color: '#f8fafc',
          }}
        >
          {/* Top Bar: League & Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 26, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
              {parsed.league.name}
            </span>
            <span style={{ fontSize: 22, letterSpacing: '2px', textTransform: 'uppercase', color: isLive ? '#ff3366' : '#00ff87', fontWeight: 700 }}>
              {statusLine}
            </span>
          </div>

          {/* Center Scoreboard */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', margin: '20px 0' }}>
            {/* Home Team */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 340 }}>
              {homeLogoData ? (
                <img src={homeLogoData} alt={parsed.home.name} width={200} height={200} style={{ objectFit: 'contain' }} />
              ) : (
                <div style={{ width: 180, height: 180, borderRadius: 90, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 700 }}>
                  {parsed.home.short || 'HOM'}
                </div>
              )}
              <span style={{ fontSize: 32, fontWeight: 700, marginTop: 18, textAlign: 'center', maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {parsed.home.name}
              </span>
            </div>

            {/* Score or VS */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 20px' }}>
              {isFinished || isLive ? (
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 110, fontWeight: 800, letterSpacing: '2px', color: '#ffffff' }}>
                  <span>{parsed.home.score}</span>
                  <span style={{ margin: '0 20px', opacity: 0.6 }}>:</span>
                  <span>{parsed.away.score}</span>
                </div>
              ) : (
                <div style={{ fontSize: 72, fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)' }}>
                  VS
                </div>
              )}
              {xgText && (
                <div style={{ fontSize: 26, color: '#00f2fe', background: 'rgba(0, 242, 254, 0.1)', padding: '6px 20px', borderRadius: 20, marginTop: 8, fontWeight: 700 }}>
                  {xgText}
                </div>
              )}
            </div>

            {/* Away Team */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 340 }}>
              {awayLogoData ? (
                <img src={awayLogoData} alt={parsed.away.name} width={200} height={200} style={{ objectFit: 'contain' }} />
              ) : (
                <div style={{ width: 180, height: 180, borderRadius: 90, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 700 }}>
                  {parsed.away.short || 'AWY'}
                </div>
              )}
              <span style={{ fontSize: 32, fontWeight: 700, marginTop: 18, textAlign: 'center', maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {parsed.away.name}
              </span>
            </div>
          </div>

          {/* Bottom Bar: Brand Watermark */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.12)', paddingTop: 16 }}>
            <span style={{ fontSize: 20, color: '#64748b' }}>
              {parsed.venue?.name ? `${parsed.venue.name}` : ''}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>⚽</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#00ff87' }}>Matchday Arena</span>
            </div>
          </div>
        </div>
      );
    } else if (kind === 'team') {
      const teamUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${cleanId}`;
      const teamRes = await fetch(teamUrl, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(3000),
      });

      const teamData = teamRes.ok ? await teamRes.json() : null;
      const team = teamData?.team || teamData || {};
      const teamColor = darkenColor(team.color || '101720');
      const logoData = await loadLogoDataUrl(team.logos?.[0]?.href);

      jsxElement = (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '56px 64px',
            background: `linear-gradient(135deg, ${teamColor} 0%, #06090e 100%)`,
            fontFamily: font ? 'Barlow Semi Condensed' : 'sans-serif',
            color: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 24 }}>⚽</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#00ff87' }}>Matchday Arena</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
            {logoData ? (
              <img src={logoData} alt={team.displayName} width={260} height={260} style={{ objectFit: 'contain' }} />
            ) : (
              <div style={{ width: 220, height: 220, borderRadius: 110, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, fontWeight: 700 }}>
                {team.abbreviation || 'FC'}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>
                {team.displayName || 'Football Club'}
              </span>
              <span style={{ fontSize: 28, color: '#94a3b8' }}>
                {team.standingSummary || 'Official Club Hub & Squad'}
              </span>
            </div>
          </div>

          <div style={{ fontSize: 20, color: '#64748b' }}>
            Full fixtures, results, standings and squad breakdown.
          </div>
        </div>
      );
    } else if (kind === 'league') {
      const espnSlug = fromUrlName(cleanId) || cleanId;
      const leagueInfo = LEAGUE_SEO_DATA[espnSlug] || { name: 'Competition' };

      jsxElement = (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '56px 64px',
            background: 'linear-gradient(135deg, #0a1c13 0%, #050b07 100%)',
            fontFamily: font ? 'Barlow Semi Condensed' : 'sans-serif',
            color: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 24 }}>⚽</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#00ff87' }}>Matchday Arena</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 32, letterSpacing: '2px', textTransform: 'uppercase', color: '#00ff87', fontWeight: 700, marginBottom: 12 }}>
              Official League Center
            </span>
            <span style={{ fontSize: 72, fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
              {leagueInfo.name}
            </span>
            <span style={{ fontSize: 28, color: '#94a3b8' }}>
              Live scores, fixtures, expected goals (xG) & standings
            </span>
          </div>

          <div style={{ fontSize: 20, color: '#64748b' }}>
            Covering 19 global football competitions with open match analytics.
          </div>
        </div>
      );
    } else {
      // default site image
      jsxElement = (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '64px',
            background: 'linear-gradient(135deg, #04140b 0%, #020704 100%)',
            fontFamily: font ? 'Barlow Semi Condensed' : 'sans-serif',
            color: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 38 }}>⚽</span>
            <span style={{ fontSize: 38, fontWeight: 900, color: '#00ff87' }}>Matchday Arena</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 68, fontWeight: 900, lineHeight: 1.1, color: '#ffffff', marginBottom: 20 }}>
              Live Football Scores, xG &amp; Match Analytics
            </span>
            <span style={{ fontSize: 30, color: '#94a3b8' }}>
              Live scores · Expected Goals (xG) · Tactics board · 2D Replays
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 20 }}>
            <span style={{ fontSize: 22, color: '#64748b' }}>
              Premier League, La Liga, Serie A, Bundesliga, Ligue 1 &amp; Champions League
            </span>
            <span style={{ fontSize: 22, color: '#00ff87', fontWeight: 700 }}>
              matchdayarena.com
            </span>
          </div>
        </div>
      );
    }

    const imageResponse = new ImageResponse(jsxElement, {
      width: 1200,
      height: 675,
      fonts: fontOptions,
    });

    const imageBuffer = await imageResponse.arrayBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', cacheHeader);
    res.status(200).send(Buffer.from(imageBuffer));
  } catch (err) {
    res.status(500).send(`Image generation failed: ${err.message}`);
  }
}
