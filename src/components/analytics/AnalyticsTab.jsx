import { useState, useMemo } from 'react';
import { useMatchAnalytics } from '../../hooks/useMatchAnalytics';
import { getTeamColors } from './teamColors';
import './Analytics.css';

// Cards
import MatchStory from './MatchStory';
import WinChanceCard from './WinChanceCard';
import ChancesCard from './ChancesCard';
import OnTopCard from './OnTopCard';
import ShotMap from './ShotMap';
import GoalFrame from './GoalFrame';
import LineupPitch from './LineupPitch';
import TopPerformers from './TopPerformers';
import PredictionCard from './PredictionCard';
import AccuracySheet from './AccuracySheet';

const COVERED_LEAGUES = new Set([
  'eng.1',
  'esp.1',
  'ger.1',
  'ita.1',
  'fra.1',
  'uefa.champions',
]);

const HINT_STORAGE_KEY = 'analytics_hint_dismissed';
const TAB_STORAGE_KEY = 'analytics_active_section';

export default function AnalyticsTab({ match, onPlayerClick }) {
  const eventId = match?.id;
  const matchStatus = match?.status;
  const leagueSlug = match?.leagueSlug || match?.league?.slug || 'eng.1';

  // Section switcher: 'summary' | 'shots' | 'players'
  const [activeSection, setActiveSection] = useState(() => {
    try {
      return localStorage.getItem(TAB_STORAGE_KEY) || 'summary';
    } catch {
      return 'summary';
    }
  });

  // First-visit dismissable hint
  const [showHint, setShowHint] = useState(() => {
    try {
      return !localStorage.getItem(HINT_STORAGE_KEY);
    } catch {
      return false;
    }
  });

  const [isAccuracyOpen, setIsAccuracyOpen] = useState(false);

  const handleSectionChange = (section) => {
    setActiveSection(section);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, section);
    } catch {
      // ignore
    }
  };

  const handleDismissHint = () => {
    setShowHint(false);
    try {
      localStorage.setItem(HINT_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const isPostponed = matchStatus === 'postponed';
  const isUpcoming = matchStatus === 'upcoming' || matchStatus === 'pre';
  const isCoveredLeague = COVERED_LEAGUES.has(leagueSlug);

  // Fetch analytics for live and finished matches
  const {
    data: analytics,
    isLoading,
    isError,
    refetch,
  } = useMatchAnalytics(eventId, matchStatus, {
    enabled: Boolean(eventId && !isPostponed && !isUpcoming),
  });

  // Merge match details with analytics response for robust team info
  const effectiveMatch = useMemo(() => {
    return {
      id: eventId,
      leagueSlug,
      status: matchStatus,
      home: {
        id: match?.homeTeam?.id || analytics?.match?.home?.id,
        name: match?.homeTeam?.name || analytics?.match?.home?.name || 'Home',
        score: analytics?.match?.home?.score ?? match?.score?.home ?? match?.homeTeam?.score ?? 0,
        color: analytics?.match?.home?.color || match?.homeTeam?.color,
        alt_color: analytics?.match?.home?.alt_color || match?.homeTeam?.altColor,
      },
      away: {
        id: match?.awayTeam?.id || analytics?.match?.away?.id,
        name: match?.awayTeam?.name || analytics?.match?.away?.name || 'Away',
        score: analytics?.match?.away?.score ?? match?.score?.away ?? match?.awayTeam?.score ?? 0,
        color: analytics?.match?.away?.color || match?.awayTeam?.color,
        alt_color: analytics?.match?.away?.alt_color || match?.awayTeam?.altColor,
      },
    };
  }, [match, analytics, eventId, leagueSlug, matchStatus]);

  // Compute contrast-safe and clash-free team colors
  const colors = useMemo(() => {
    return getTeamColors(effectiveMatch.home, effectiveMatch.away);
  }, [effectiveMatch.home, effectiveMatch.away]);

  // Postponed state
  if (isPostponed) {
    return (
      <div className="analytics-container">
        <div className="analytics-state-box">
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-main)' }}>
            This match was postponed.
          </p>
        </div>
      </div>
    );
  }

  // Pre-match / Upcoming state
  if (isUpcoming) {
    if (!isCoveredLeague) {
      return (
        <div className="analytics-container">
          <div className="analytics-state-box">
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
              Detailed analytics aren&apos;t available for this competition yet.
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Available leagues: Premier League, La Liga, Bundesliga, Serie A, Ligue 1, UEFA Champions League.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="analytics-container">
        <PredictionCard
          match={match}
          colors={colors}
          onOpenAccuracy={() => setIsAccuracyOpen(true)}
        />
        <AccuracySheet
          isOpen={isAccuracyOpen}
          onClose={() => setIsAccuracyOpen(false)}
          league={leagueSlug}
        />
        <footer className="analytics-footer-credits">
          <span>Expected goals model trained on</span>
          <a
            href="https://github.com/statsbomb/open-data"
            target="_blank"
            rel="noopener noreferrer"
          >
            StatsBomb open data
          </a>
        </footer>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="analytics-container">
        <div className="analytics-skeleton-card" style={{ minHeight: '80px' }} />
        <div className="analytics-skeleton-card" style={{ minHeight: '160px' }} />
        <div className="analytics-skeleton-card" style={{ minHeight: '140px' }} />
      </div>
    );
  }

  // Error state
  if (isError || !analytics) {
    if (!isCoveredLeague) {
      return (
        <div className="analytics-container">
          <div className="analytics-state-box">
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
              Detailed analytics aren&apos;t available for this competition yet.
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Available leagues: Premier League, La Liga, Bundesliga, Serie A, Ligue 1, UEFA Champions League.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="analytics-container">
        <div className="analytics-state-box">
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
            Analytics are temporarily unavailable
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="analytics-retry-btn"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const isLive = matchStatus === 'live' || matchStatus === 'in' || analytics.match?.status === 'in';
  const hasShots = Array.isArray(analytics.shots) && analytics.shots.length > 0;

  return (
    <div className="analytics-container">
      {/* First-visit dismissable hint banner */}
      {showHint && (
        <div className="analytics-hint-banner" role="status">
          <span>
            Analytics shows <em>how</em> the match was played, not just the score. Tap ⓘ on any card to see what it means.
          </span>
          <button
            type="button"
            onClick={handleDismissHint}
            className="analytics-hint-close"
            aria-label="Dismiss analytics hint"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub-navigation switcher: Summary · Shots · Players */}
      <nav className="analytics-subnav-wrap" aria-label="Analytics sections">
        <div className="analytics-subnav-pill" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'summary'}
            onClick={() => handleSectionChange('summary')}
            className={`analytics-subnav-btn ${activeSection === 'summary' ? 'active' : ''}`}
          >
            Summary
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'shots'}
            onClick={() => handleSectionChange('shots')}
            className={`analytics-subnav-btn ${activeSection === 'shots' ? 'active' : ''}`}
          >
            Shots
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'players'}
            onClick={() => handleSectionChange('players')}
            className={`analytics-subnav-btn ${activeSection === 'players' ? 'active' : ''}`}
          >
            Players
          </button>
        </div>
      </nav>

      {/* SECTION: SUMMARY */}
      {activeSection === 'summary' && (
        <section aria-label="Match Summary" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Match Story */}
          {analytics.story && analytics.story.length > 0 && (
            <MatchStory story={analytics.story} />
          )}

          {/* Win Chances */}
          <WinChanceCard
            winProb={analytics.win_prob}
            status={analytics.match?.status || matchStatus}
            homeName={effectiveMatch.home.name}
            awayName={effectiveMatch.away.name}
            colors={colors}
            onOpenAccuracy={() => setIsAccuracyOpen(true)}
          />

          {/* Chances Created (xG) */}
          <ChancesCard
            xg={analytics.xg}
            homeName={effectiveMatch.home.name}
            awayName={effectiveMatch.away.name}
            homeScore={effectiveMatch.home.score}
            awayScore={effectiveMatch.away.score}
            colors={colors}
          />

          {/* Who Was On Top (Momentum) */}
          <OnTopCard
            momentum={analytics.momentum}
            homeName={effectiveMatch.home.name}
            awayName={effectiveMatch.away.name}
            colors={colors}
          />
        </section>
      )}

      {/* SECTION: SHOTS */}
      {activeSection === 'shots' && (
        <section aria-label="Shots Analysis" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!hasShots ? (
            <div className="analytics-state-box">
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
                {isLive ? 'No shots yet. This page fills in as the match goes on.' : 'No shot data available for this match.'}
              </p>
            </div>
          ) : (
            <>
              <ShotMap
                shots={analytics.shots}
                match={effectiveMatch}
                colors={colors}
              />
              <GoalFrame
                shots={analytics.shots}
                match={effectiveMatch}
                colors={colors}
              />
            </>
          )}
        </section>
      )}

      {/* SECTION: PLAYERS */}
      {activeSection === 'players' && (
        <section aria-label="Players and Formations" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <LineupPitch
            rosters={analytics.rosters}
            match={effectiveMatch}
            shots={analytics.shots}
            events={analytics.events}
            colors={colors}
            onPlayerClick={onPlayerClick}
          />
          <TopPerformers
            players={analytics.players}
            rosters={analytics.rosters}
            match={effectiveMatch}
            colors={colors}
            onPlayerClick={onPlayerClick}
          />
        </section>
      )}

      {/* Accuracy Sheet Modal */}
      <AccuracySheet
        isOpen={isAccuracyOpen}
        onClose={() => setIsAccuracyOpen(false)}
        league={leagueSlug}
      />

      {/* Footer Attribution (StatsBomb License requirement) */}
      <footer className="analytics-footer-credits">
        <span>Expected goals model trained on</span>
        <a
          href="https://github.com/statsbomb/open-data"
          target="_blank"
          rel="noopener noreferrer"
        >
          StatsBomb open data
        </a>
      </footer>
    </div>
  );
}
