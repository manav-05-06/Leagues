import { create } from 'zustand';

export const useAppStore = create((set) => ({
  // The State Variables
  selectedLeague: 'all',
  selectedSeason: '2026',
  selectedMatchId: null,
  selectedPlayer: null,
  activeTab: 'matches',
  statusFilter: 'all', // 'all' | 'live' | 'upcoming' | 'finished'
  showLiveModal: false,

  // The Setters (Actions to change the state)
  setSelectedLeague: (league) => set({ selectedLeague: league }),
  setSelectedSeason: (season) => set({ selectedSeason: season }),
  setSelectedMatchId: (id) => set({ selectedMatchId: id }),
  setSelectedPlayer: (player) => set({ selectedPlayer: player }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
  setShowLiveModal: (show) => set({ showLiveModal: show }),
}));
