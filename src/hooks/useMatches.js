import { useQuery, useQueries } from '@tanstack/react-query';
import {
  fetchDayMatches,
  fetchLeagueSeason,
  fetchMatchSummary,
  fetchLeagueStandings,
  fetchFullPlayerProfile,
  searchPlayers,
  mapSummaryHeader,
  normalizeDateKey,
  getTodayDateKey,
  isTodayKey,
  isPastDateKey,
} from '../api';

export function useDayMatches(dateKey, options = {}) {
  const key = normalizeDateKey(dateKey);
  const isToday = isTodayKey(key);
  const isPast = isPastDateKey(key);

  return useQuery({
    queryKey: ['matches', 'day', key],
    queryFn: () => fetchDayMatches(key),
    staleTime: isPast ? Infinity : 30 * 1000,
    refetchInterval: (query) => {
      if (isPast) return false;
      const data = query.state.data;
      const hasLiveMatch = data?.matches?.some((m) => m.status === 'live');
      if (hasLiveMatch) {
        return 30 * 1000; // 30s only while a match is live
      }
      if (isToday) {
        return 5 * 60 * 1000; // 5m for today otherwise
      }
      return false; // never for other/past days
    },
    ...options,
  });
}

export function useLeagueSeason(slug, season, options = {}) {
  const isEnabled = Boolean(slug && slug !== 'all' && season);

  return useQuery({
    queryKey: ['matches', 'season', slug, season],
    queryFn: () => fetchLeagueSeason(slug, season),
    enabled: isEnabled,
    staleTime: 10 * 60 * 1000, // 10 min
    refetchInterval: false, // never polled
    ...options,
  });
}

export function useTodayMatches(options = {}) {
  return useDayMatches(getTodayDateKey(), options);
}

export function useMatches({ league = 'all', season, dateKey = null, options = {} } = {}) {
  const isAll = league === 'all';
  const effectiveDate = dateKey || getTodayDateKey();

  const dayQuery = useDayMatches(effectiveDate, {
    enabled: isAll && (options.enabled !== undefined ? options.enabled : true),
    ...options,
  });

  const seasonQuery = useLeagueSeason(league, season, {
    enabled: !isAll && (options.enabled !== undefined ? options.enabled : true),
    ...options,
  });

  return isAll ? dayQuery : seasonQuery;
}

export function useFavoriteMatches(favoriteIds = []) {
  const ids = Array.isArray(favoriteIds) ? favoriteIds : [];
  const queryResults = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['matchSummary', id],
      queryFn: () => fetchMatchSummary(id),
      enabled: Boolean(id),
      staleTime: 60 * 1000,
    })),
  });

  const isLoading = ids.length > 0 && queryResults.some((q) => q.isLoading);
  const matches = queryResults
    .map((q) => {
      if (q.data?.header) {
        return mapSummaryHeader(q.data.header);
      }
      return null;
    })
    .filter(Boolean);

  return { matches, isLoading };
}

export function useMatchSummary(id, options = {}) {
  return useQuery({
    queryKey: ['matchSummary', id],
    queryFn: () => fetchMatchSummary(id),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useStandings(slug, season, options = {}) {
  const effectiveSlug = !slug || slug === 'all' ? 'eng.1' : slug;

  return useQuery({
    queryKey: ['standings', effectiveSlug, season],
    queryFn: () => fetchLeagueStandings(effectiveSlug, season),
    enabled: Boolean(effectiveSlug && season),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function usePlayerSearch(query, options = {}) {
  const trimmed = query ? query.trim() : '';

  return useQuery({
    queryKey: ['playerSearch', trimmed],
    queryFn: () => searchPlayers(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

export function usePlayerProfile(id, teamId, slug, season, options = {}) {
  return useQuery({
    queryKey: ['playerProfile', id, teamId, slug, season],
    queryFn: () => fetchFullPlayerProfile(id, teamId, slug, season),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}
