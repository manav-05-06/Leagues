import { useQuery } from '@tanstack/react-query';
import { fetchPrematchPrediction } from '../analyticsApi';

/**
 * Hook to fetch pre-match Dixon-Coles prediction for an upcoming match.
 * Keyed by match.id so old predictions are never shared across matches.
 * Sends home_id / away_id (or exact names).
 *
 * @param {object} match - The match object from mapEvent
 * @param {object} [options] - Additional TanStack Query options
 */
export function usePrematchPrediction(match, options = {}) {
  const matchId = match?.id;
  const league = match?.leagueSlug || 'eng.1';
  const homeId = match?.homeTeam?.id || match?.homeTeamId;
  const awayId = match?.awayTeam?.id || match?.awayTeamId;
  const home = match?.homeTeam?.name;
  const away = match?.awayTeam?.name;

  return useQuery({
    queryKey: ['prediction', String(matchId)],
    queryFn: () =>
      fetchPrematchPrediction({
        league,
        homeId,
        awayId,
        home,
        away,
      }),
    enabled: Boolean(matchId && (homeId || home) && (awayId || away)),
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: false, // 404 means no prediction for this league/team
    ...options,
  });
}
