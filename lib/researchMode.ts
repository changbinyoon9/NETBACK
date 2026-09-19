"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ResearchModeStore {
  enabled: boolean;
  toggle: () => void;
}

export const useResearchMode = create<ResearchModeStore>()(
  persist(
    (set, get) => ({
      enabled: false,
      toggle: () => set({ enabled: !get().enabled }),
    }),
    { name: "netback-research-mode" }
  )
);
