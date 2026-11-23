import { useQuery } from '@tanstack/react-query';
import {
  fetchLeagueTeams,
  fetchTeamSquad,
  fetchTeamLastLineup,
  fetchMatchLineups,
} from '../api';

export function useLeagueTeams(slug, options = {}) {
  return useQuery({
    queryKey: ['tactics', 'teams', slug],
    queryFn: () => fetchLeagueTeams(slug),
    enabled: Boolean(slug),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    ...options,
  });
}

export function useTeamSquad(slug, teamId, options = {}) {
  return useQuery({
    queryKey: ['tactics', 'squad', slug, teamId],
    queryFn: () => fetchTeamSquad(slug, teamId),
    enabled: Boolean(slug && teamId),
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
    ...options,
  });
}

export function useTeamLastLineup(slug, teamId, options = {}) {
  return useQuery({
    queryKey: ['tactics', 'last', slug, teamId],
    queryFn: () => fetchTeamLastLineup(slug, teamId),
    enabled: Boolean(slug && teamId),
    staleTime: 60 * 60 * 1000, // 1 hour
    ...options,
  });
}

export function useMatchLineups(eventId, options = {}) {
  return useQuery({
    queryKey: ['tactics', 'match', eventId],
    queryFn: () => fetchMatchLineups(eventId),
    enabled: Boolean(eventId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}
