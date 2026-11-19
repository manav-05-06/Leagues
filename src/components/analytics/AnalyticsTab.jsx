import { useState, useEffect } from 'react';
import { useMatchAnalytics } from '../../hooks/useMatchAnalytics';
import { fetchPrematchPrediction } from '../../analyticsApi';
import XgSummary from './XgSummary';
import ShotMap from './ShotMap';
import GoalMouthView from './GoalMouthView';
import EventMap from './EventMap';
import WinProbBar from './WinProbBar';
import WinProbChart from './WinProbChart';
import MomentumWave from './MomentumWave';
import ScorelineGrid from './ScorelineGrid';
import AccuracyModal from './AccuracyModal';
import LineupPitch from './LineupPitch';
import KeeperCard from './KeeperCard';
import PlayerTable from './PlayerTable';

export default function AnalyticsTab({ match, onPlayerClick }) {
  const [isAccuracyOpen, setIsAccuracyOpen] = useState(false);
  const [prematchPred, setPrematchPred] = useState(null);

  const eventId = match?.id;
  const matchStatus = match?.status;
  const leagueSlug = match?.leagueSlug || match?.league?.slug || 'eng.1';

  const { data: analytics, isLoading, error } = useMatchAnalytics(eventId, matchStatus);

  // If upcoming match, load pre-match prediction
  useEffect(() => {
    const isUpcoming = matchStatus === 'upcoming' || matchStatus === 'pre';
    if (isUpcoming && match?.homeTeam?.name && match?.awayTeam?.name) {
      fetchPrematchPrediction({
        league: leagueSlug,
        home: match.homeTeam.name,
        away: match.awayTeam.name,
      })
        .then((pred) => setPrematchPred(pred))
        .catch(() => {});
    }
  }, [matchStatus, match?.homeTeam?.name, match?.awayTeam?.name, leagueSlug]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 animate-pulse">
        <div className="h-28 rounded-2xl bg-slate-800/60 border border-slate-700/50" />
        <div className="h-44 rounded-2xl bg-slate-800/60 border border-slate-700/50" />
        <div className="h-64 rounded-2xl bg-slate-800/60 border border-slate-700/50" />
      </div>
    );
  }

  // Pre-match view for upcoming fixtures
  if (matchStatus === 'upcoming' || matchStatus === 'pre') {
    return (
      <div className="space-y-6">
        {prematchPred ? (
          <>
            <WinProbBar
              winProb={prematchPred.win_probability}
              match={match}
              onOpenAccuracy={() => setIsAccuracyOpen(true)}
            />
            <ScorelineGrid
              prediction={prematchPred}
              onOpenAccuracy={() => setIsAccuracyOpen(true)}
            />
          </>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
            <div className="inline-flex p-3 rounded-full bg-slate-800 text-slate-400 mb-3 text-2xl">
              ⏱️
            </div>
            <h3 className="text-base font-semibold text-slate-200 mb-1">
              Match Has Not Started
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Live win probabilities, pitch shot locations, and momentum waves will update in real-time once kickoff occurs.
            </p>
          </div>
        )}

        <AccuracyModal
          isOpen={isAccuracyOpen}
          onClose={() => setIsAccuracyOpen(false)}
          league={leagueSlug}
        />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
        <div className="inline-flex p-3 rounded-full bg-slate-800 text-slate-400 mb-3 text-2xl">
          📊
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">
          Detailed Analytics Unavailable
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          {error?.message ||
            'Pitch coordinates and shot event data are not yet available for this match. Coverage is active for top European leagues, cups, and international tournaments.'}
        </p>
      </div>
    );
  }

  const {
    shots = [],
    xg,
    events = [],
    win_prob: winProb,
    momentum = [],
    players = [],
    rosters = [],
    match: matchMeta,
  } = analytics;
  const effectiveMatch = matchMeta || match;

  const hasShots = shots && shots.length > 0;
  const hasEvents = events && events.length > 0;
  const hasXg = xg && (xg.home > 0 || xg.away > 0 || (xg.timeline && xg.timeline.length > 0));
  const hasWinProb = Boolean(winProb && (winProb.home > 0 || winProb.away > 0));
  const hasMomentum = momentum && momentum.length > 0;
  const hasLineups = rosters && rosters.length > 0;
  const hasPlayers = players && players.length > 0;

  if (!hasShots && !hasEvents && !hasXg && !hasWinProb && !hasLineups) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
        <div className="inline-flex p-3 rounded-full bg-slate-800 text-slate-400 mb-3 text-2xl">
          ⏱️
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">
          No Match Events Recorded Yet
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Shot locations and expected goals data will appear as events unfold once kickoff occurs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Live Win Probability Bar */}
      {hasWinProb && (
        <WinProbBar
          winProb={winProb}
          match={effectiveMatch}
          onOpenAccuracy={() => setIsAccuracyOpen(true)}
        />
      )}

      {/* 2. Win Probability Progression Chart */}
      {hasWinProb && winProb.history && winProb.history.length > 1 && (
        <WinProbChart
          history={winProb.history}
          match={effectiveMatch}
          onOpenAccuracy={() => setIsAccuracyOpen(true)}
        />
      )}

      {/* 3. Attacking Momentum Wave */}
      {hasMomentum && (
        <MomentumWave momentum={momentum} match={effectiveMatch} />
      )}

      {/* 4. Expected Goals (xG) Summary & Cumulative Step Chart */}
      {hasXg && <XgSummary match={effectiveMatch} xg={xg} />}

      {/* 5. Half-Pitch Shot Map */}
      {hasShots && <ShotMap match={effectiveMatch} shots={shots} />}

      {/* 6. Goal-Mouth Placement View */}
      {hasShots && <GoalMouthView match={effectiveMatch} shots={shots} />}

      {/* 7. Pitch Events Map & Final Third Zones */}
      {hasEvents && <EventMap match={effectiveMatch} events={events} />}

      {/* 8. Tactical Lineups & Formation Pitch */}
      {hasLineups && (
        <LineupPitch
          rosters={rosters}
          match={effectiveMatch}
          shots={shots}
          events={events}
          onPlayerClick={onPlayerClick}
        />
      )}

      {/* 9. Goalkeeper Impact · Goals Prevented */}
      {hasLineups && <KeeperCard rosters={rosters} match={effectiveMatch} />}

      {/* 10. Player Tactical Statistics Table */}
      {hasPlayers && (
        <PlayerTable
          players={players}
          match={effectiveMatch}
          onPlayerClick={onPlayerClick}
        />
      )}

      {/* Accuracy & Calibration Modal */}
      <AccuracyModal
        isOpen={isAccuracyOpen}
        onClose={() => setIsAccuracyOpen(false)}
        league={leagueSlug}
      />
    </div>
  );
}
