"use client";

import { create } from "zustand";
import { Competition, FilterState } from "@/types";

interface MapStore {
  competitions: Competition[];
  total: number;
  filters: FilterState;
  selectedCompetition: Competition | null;
  isLoading: boolean;

  setCompetitions: (competitions: Competition[], total: number) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setSelectedCompetition: (competition: Competition | null) => void;
  setIsLoading: (loading: boolean) => void;
}

const today = new Date().toISOString().split("T")[0];
const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

export const useMapStore = create<MapStore>((set) => ({
  competitions: [],
  total: 0,
  filters: {
    dateFrom: today,
    dateTo: nextYear,
    region: "",
    sources: {
      ibjjf: true,
      jjwl: true,
      agf: true,
      naga: true,
      adcc: true,
    },
    gi: true,
    nogi: true,
    adult: true,
    kids: true,
  },
  selectedCompetition: null,
  isLoading: false,

  setCompetitions: (competitions, total) => set({ competitions, total }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  setSelectedCompetition: (competition) =>
    set({ selectedCompetition: competition }),
  setIsLoading: (isLoading) => set({ isLoading }),
}));
