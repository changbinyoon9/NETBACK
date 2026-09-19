// NETBACK simulation engine.
//
// These are the exact formulas used to derive the historical research dataset
// (verified against Data/processed/08_netback_final_recovery_priority.csv —
// recomputing them from raw components reproduces the stored values). The
// engine recomputes live from job/candidate inputs rather than reading
// precomputed columns, so the UI reflects a running model, not a replay.
import type { Candidate, Job } from "./types";

export function priorityClass(score: number | null): string {
  if (score === null) return "NOT_SCORED";
  if (score >= 0.55) return "VERY_HIGH";
  if (score >= 0.4) return "HIGH";
  if (score >= 0.25) return "MEDIUM";
  return "LOW";
}

export interface EnvironmentalResult {
  scored: boolean;
  gearHazardPrior: number | null;
  mpaProximityScore: number | null;
  environmentalPriority: number | null;
  environmentalClass: string;
  reasons: string[];
}

export function computeEnvironmentalPriority(job: Job): EnvironmentalResult {
  if (job.gearHazardPrior === null) {
    return {
      scored: false,
      gearHazardPrior: null,
      mpaProximityScore: job.mpaProximityScore,
      environmentalPriority: null,
      environmentalClass: "NOT_SCORED",
      reasons: [
        "No defensible gear-family hazard match for the reported material.",
        "Insufficient evidence to derive a relative ecological hazard prior.",
      ],
    };
  }
  const gearHazardPrior = job.gearHazardPrior;
  const mpaProximityScore = job.mpaProximityScore ?? 0;
  const environmentalPriority = 0.6 * gearHazardPrior + 0.4 * mpaProximityScore;
  const reasons: string[] = [];
  reasons.push(
    gearHazardPrior >= 0.5
      ? "Relatively high gear-hazard evidence for this gear family"
      : "Moderate gear-hazard evidence for this gear family"
  );
  reasons.push(
    mpaProximityScore >= 0.6
      ? "High proximity to a Marine Protected Area"
      : mpaProximityScore >= 0.3
        ? "Moderate proximity to a Marine Protected Area"
        : "Low proximity to a Marine Protected Area"
  );
  return {
    scored: true,
    gearHazardPrior,
    mpaProximityScore,
    environmentalPriority: round4(environmentalPriority),
    environmentalClass: priorityClass(environmentalPriority),
    reasons,
  };
}

export function computeDepthRecoverability(depthM: number | null): number | null {
  if (depthM === null) return null;
  return round4(Math.exp(-depthM / 200));
}

export interface PreliminaryResult {
  preliminaryPriority: number | null;
  reasons: string[];
}

export function computePreliminaryPriority(
  env: EnvironmentalResult,
  depthRecoverability: number | null
): PreliminaryResult {
  if (!env.scored || env.environmentalPriority === null || depthRecoverability === null) {
    return { preliminaryPriority: null, reasons: [] };
  }
  const value = round4(env.environmentalPriority * depthRecoverability);
  const reasons = [
    depthRecoverability >= 0.85
      ? "Very shallow bathymetric context supports recovery"
      : depthRecoverability >= 0.6
        ? "Moderate bathymetric depth increases recovery difficulty"
        : "Deep bathymetric context substantially reduces recoverability",
  ];
  return { preliminaryPriority: value, reasons };
}

export function computeVesselSuitability(distanceKm: number, tonnage: number) {
  const routeProximityScore = round4(Math.exp(-distanceKm / 5));
  const tonnageCapacityProxy = round4(1 - Math.exp(-tonnage / 10));
  const vesselSuitabilityScore = round4(0.7 * routeProximityScore + 0.3 * tonnageCapacityProxy);
  return { routeProximityScore, tonnageCapacityProxy, vesselSuitabilityScore };
}

export function rankCandidates(candidates: Candidate[]): Candidate[] {
  return [...candidates]
    .map((c) => {
      const recomputed = computeVesselSuitability(c.distanceKm, c.vesselTonnage);
      return { ...c, ...recomputed };
    })
    .sort((a, b) => b.vesselSuitabilityScore - a.vesselSuitabilityScore);
}

export function bestCandidate(candidates: Candidate[]): Candidate | null {
  if (candidates.length === 0) return null;
  return rankCandidates(candidates)[0];
}

export function nearestCandidate(candidates: Candidate[]): Candidate | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.distanceKm - b.distanceKm)[0];
}

export interface FinalPriorityResult {
  finalPriority: number | null;
  finalClass: string;
  formula: string;
}

export function computeFinalPriority(
  environmentalPriority: number | null,
  depthRecoverability: number | null,
  vesselSuitability: number | null
): FinalPriorityResult {
  if (environmentalPriority === null || depthRecoverability === null || vesselSuitability === null) {
    return { finalPriority: null, finalClass: "NOT_SCORED", formula: "" };
  }
  const value = round4(environmentalPriority * depthRecoverability * vesselSuitability);
  return {
    finalPriority: value,
    finalClass: priorityClass(value),
    formula: `${environmentalPriority.toFixed(3)} × ${depthRecoverability.toFixed(3)} × ${vesselSuitability.toFixed(3)} = ${value.toFixed(4)}`,
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
