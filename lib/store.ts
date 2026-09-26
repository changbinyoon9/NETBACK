"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Mission, MissionSource, MissionStatus } from "./types";
import { MISSION_STATES } from "./types";

function nextId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

interface MissionStore {
  missions: Mission[];
  createMission: (params: {
    scenarioKey: MissionSource;
    jobId: string;
    candidateVesselCount: number;
  }) => Mission;
  advance: (missionId: string, status: MissionStatus) => void;
  setVessel: (missionId: string, vesselId: string, bestVesselDistanceKm: number) => void;
  setFinalPriority: (missionId: string, finalPriority: number | null) => void;
  setCandidateVesselCount: (missionId: string, candidateVesselCount: number) => void;
  setCircularization: (missionId: string, value: Mission["circularization"]) => void;
  setRecoveryResult: (missionId: string, value: Mission["recoveryResult"]) => void;
  setRecoveredWeight: (missionId: string, weight: number) => void;
  reset: () => void;
}

function timelineKeyFor(status: MissionStatus): string {
  const map: Record<MissionStatus, string> = {
    REPORTED: "reported",
    VERIFIED: "verified",
    PRIORITIZED: "prioritized",
    MATCHED: "matched",
    REQUESTED: "requested",
    ACCEPTED: "accepted",
    IN_PROGRESS: "inProgress",
    RECOVERED: "recovered",
    VERIFIED_RECOVERY: "verifiedRecovery",
    CLOSED: "closed",
  };
  return map[status];
}

export const useMissionStore = create<MissionStore>()(
  persist(
    (set, get) => ({
      missions: [],
      createMission: ({ scenarioKey, jobId, candidateVesselCount }) => {
        const now = new Date().toISOString();
        const mission: Mission = {
          missionId: nextId("NB-M"),
          reportId: nextId("NB-R"),
          scenarioKey,
          jobId,
          vesselId: null,
          status: "REPORTED",
          createdAt: now,
          timeline: { reported: now },
          finalPriority: null,
          candidateVesselCount,
          bestVesselDistanceKm: null,
        };
        set({ missions: [mission, ...get().missions] });
        return mission;
      },
      advance: (missionId, status) => {
        set({
          missions: get().missions.map((m) => {
            if (m.missionId !== missionId) return m;
            if (m.recoveryResult === "Failed" && status !== "CLOSED") return m;
            const currentIdx = MISSION_STATES.indexOf(m.status);
            const nextIdx = MISSION_STATES.indexOf(status);
            if (nextIdx <= currentIdx) return m; // no backward / duplicate transitions
            const key = timelineKeyFor(status);
            return {
              ...m,
              status,
              timeline: { ...m.timeline, [key]: new Date().toISOString() },
            };
          }),
        });
      },
      setVessel: (missionId, vesselId, bestVesselDistanceKm) => {
        set({
          missions: get().missions.map((m) =>
            m.missionId === missionId ? { ...m, vesselId, bestVesselDistanceKm } : m
          ),
        });
      },
      setFinalPriority: (missionId, finalPriority) => {
        set({
          missions: get().missions.map((m) =>
            m.missionId === missionId ? { ...m, finalPriority } : m
          ),
        });
      },
      setCandidateVesselCount: (missionId, candidateVesselCount) => {
        set({
          missions: get().missions.map((m) =>
            m.missionId === missionId ? { ...m, candidateVesselCount } : m
          ),
        });
      },
      setCircularization: (missionId, value) => {
        set({
          missions: get().missions.map((m) =>
            m.missionId === missionId ? { ...m, circularization: value } : m
          ),
        });
      },
      setRecoveryResult: (missionId, value) => {
        set({
          missions: get().missions.map((m) =>
            m.missionId === missionId ? { ...m, recoveryResult: value } : m
          ),
        });
      },
      setRecoveredWeight: (missionId, weight) => {
        if (!Number.isFinite(weight) || weight < 0) return;
        set({ missions: get().missions.map(m => m.missionId === missionId ? { ...m, recoveredWeightKg: weight } : m) });
      },
      reset: () => set({ missions: [] }),
    }),
    { name: "netback-missions" }
  )
);
