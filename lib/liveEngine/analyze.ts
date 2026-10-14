import "server-only";
import { nearestMpa, project } from "./geo";
import { sampleElevation } from "./bathymetry";
import { searchVessels } from "./vessels";
import {
  GEAR_CLASSES,
  MESSAGES,
  depthRecoverability,
  environmentalPriority,
  finalPriority,
  mpaProximityScore,
} from "./formulas";
import type { LiveAnalysisError, LiveAnalysisResult, LiveGearClass } from "@/lib/types";

export async function analyzeLive(
  lat: number,
  lon: number,
  gearClass: string,
  locale: "en" | "ko"
): Promise<LiveAnalysisResult | LiveAnalysisError> {
  const msg = MESSAGES[locale] ?? MESSAGES.en;

  const elevation = await sampleElevation(lat, lon);
  if (elevation >= 0) {
    return { error: "INVALID_LOCATION", message: msg.invalidLocation };
  }
  const depthM = -elevation;
  const depthRecov = depthRecoverability(depthM);

  const point5179 = project([lon, lat]);
  const { mpa, distanceM, inside } = await nearestMpa(point5179);
  const mpaDistanceKm = distanceM / 1000;
  const mpaScore = mpaProximityScore(mpaDistanceKm, inside);

  const gearInfo = GEAR_CLASSES[gearClass] ?? GEAR_CLASSES.UNKNOWN;
  const gearHazardPrior = gearInfo.gearHazardPrior;
  const envPriority = environmentalPriority(gearHazardPrior, mpaScore);

  const { total: candidateTotal, candidates } = await searchVessels(point5179);
  const bestVessel = candidates[0] ?? null;
  const vesselSuit = bestVessel ? bestVessel.vesselSuitabilityScore : null;

  const final = finalPriority(envPriority, depthRecov, vesselSuit);

  const why: string[] = [];
  if (gearHazardPrior !== null) {
    const level = gearHazardPrior >= 0.5 ? msg.hazardHigh : msg.hazardModerate;
    const tierLabel = msg.tierLabel[gearInfo.tier] ?? gearInfo.tier;
    why.push(msg.whyHazard(level, tierLabel));
  } else {
    why.push(msg.whyHazardInsufficient);
  }
  why.push(inside ? msg.whyMpaInside(mpa.mpaName) : msg.whyMpaNearest(mpa.mpaName, mpaDistanceKm));
  why.push(msg.whyDepth(depthM, depthRecov));
  why.push(candidateTotal ? msg.whyCandidates(candidateTotal) : msg.whyNoCandidates);

  return {
    report: { lat, lon, gearClass: gearClass as LiveGearClass },
    environmental: {
      gearHazardPrior,
      gearEvidenceTier: gearInfo.tier,
      gearSourceLabel: gearInfo.sourceLabel,
      gearAssumption: gearInfo.assumption,
      observations: gearInfo.observations,
      catchPositiveRecords: gearInfo.catchPositiveRecords,
      mpaProximityScore: mpaScore,
      nearestMpaId: mpa.mpaId,
      nearestMpaName: mpa.mpaName,
      nearestMpaType: mpa.mpaType,
      mpaDistanceKm: Math.round(mpaDistanceKm * 10000) / 10000,
      insideMpa: inside,
      environmentalPriority: envPriority,
    },
    bathymetry: {
      depthM: Math.round(depthM * 100) / 100,
      depthRecoverability: depthRecov,
    },
    matching: {
      candidateVesselCount: candidateTotal,
      candidates,
      bestVessel,
    },
    final: {
      finalPriority: final,
    },
    explain: {
      why,
      limitations: msg.limitations,
    },
  };
}
