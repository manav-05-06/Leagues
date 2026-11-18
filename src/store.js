import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getTodayDateKey } from './api';

// Wrap our store inside `persist`
export const useAppStore = create(
  persist(
    (set) => ({
      // --- Standard UI State (Not Saved to LocalStorage) ---
      selectedLeague: 'all',
      selectedSeason: '2026',
      selectedDate: getTodayDateKey(),
      selectedMatch: null,
      selectedMatchId: null,
      selectedPlayer: null,
      activeTab: 'matches',
      statusFilter: 'all',
      showLiveModal: false,

      // --- Favorites State (Saved to LocalStorage) ---
      favorites: [], 

      // --- Actions ---
      setSelectedLeague: (league) => set({ selectedLeague: league }),
      setSelectedSeason: (season) => set({ selectedSeason: season }),
      setSelectedDate: (dateKey) => set({ selectedDate: dateKey }),
      setSelectedMatch: (match) => set({ selectedMatch: match, selectedMatchId: match?.id ?? null }),
      setSelectedMatchId: (id) => set((state) => ({ 
        selectedMatchId: id, 
        selectedMatch: id ? (state.selectedMatch?.id === id ? state.selectedMatch : { id }) : null 
      })),
      setSelectedPlayer: (player) => set({ selectedPlayer: player }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setStatusFilter: (filter) => set({ statusFilter: filter }),
      setShowLiveModal: (show) => set({ showLiveModal: show }),

      // Toggle favorite action (adds if missing, removes if exists)
      toggleFavorite: (matchId) => set((state) => {
        if (state.favorites.includes(matchId)) {
          return { favorites: state.favorites.filter(id => id !== matchId) };
        } else {
          return { favorites: [...state.favorites, matchId] };
        }
      }),
    }),
    {
      name: 'matchday-storage', // Name of the key in localStorage
      // We ONLY want to save 'favorites'. We don't want to save which tab the user was on.
      partialize: (state) => ({ favorites: state.favorites }),
    }
  )
);
