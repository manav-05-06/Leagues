import { useQuery } from '@tanstack/react-query';
import { fetchMatchAnalytics } from '../analyticsApi';

/**
 * Hook to fetch match analytics (shots, xG, events) from analytics-api.
 * Refreshes every 30 seconds when the match is live, otherwise cached.
 *
 * @param {string|number} eventId - ESPN match event ID
 * @param {string} [matchStatus] - Match status ('live', 'post', 'pre', etc.)
 * @param {object} [options] - Additional TanStack Query options
 */
export function useMatchAnalytics(eventId, matchStatus = null, options = {}) {
  const isLive = matchStatus === 'live' || matchStatus === 'in';

  return useQuery({
    queryKey: ['analytics', String(eventId)],
    queryFn: () => fetchMatchAnalytics(eventId),
    enabled: Boolean(eventId),
    staleTime: isLive ? 15 * 1000 : Infinity,
    refetchInterval: isLive ? 30 * 1000 : false,
    retry: 1,
    ...options,
  });
}
