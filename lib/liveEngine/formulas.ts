// NETBACK Priority Model v1 — frozen formulas, mirrored exactly from
// scripts/spatial_common.py (the Python reference engine) so the two paths
// cannot silently drift apart. Verified to match scripts/analyze_report.py
// output to floating-point noise for every validated historical job.
//
//   mpa_proximity_score    = 0.10 + 0.90 * exp(-distance_km / 5), or 1.0 if inside
//   depth_recoverability   = exp(-depth_m / 200)
//   environmental_priority = 0.60 * gear_hazard_prior + 0.40 * mpa_proximity_score
//   route_proximity        = exp(-distance_km / 5)
//   tonnage_capacity_proxy = 1 - exp(-tonnage_t / 10)
//   vessel_suitability     = 0.70 * route_proximity + 0.30 * tonnage_capacity_proxy
//   final_priority         = environmental_priority * depth_recoverability * vessel_suitability

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function mpaProximityScore(distanceKm: number, inside: boolean): number {
  if (inside) return 1.0;
  return round4(0.1 + 0.9 * Math.exp(-distanceKm / 5));
}

export function depthRecoverability(depthM: number): number {
  return round4(Math.exp(-Math.max(depthM, 0) / 200));
}

export function environmentalPriority(gearHazardPrior: number | null, mpaScore: number): number | null {
  if (gearHazardPrior === null) return null;
  return round4(0.6 * gearHazardPrior + 0.4 * mpaScore);
}

export function routeProximityScore(distanceKm: number): number {
  return round4(Math.exp(-distanceKm / 5));
}

export function tonnageCapacityProxy(tonnageT: number): number {
  return round4(1 - Math.exp(-tonnageT / 10));
}

export function vesselSuitabilityScore(distanceKm: number, tonnageT: number): number {
  const route = routeProximityScore(distanceKm);
  const proxy = tonnageCapacityProxy(tonnageT);
  return round4(0.7 * route + 0.3 * proxy);
}

export function finalPriority(
  envPriority: number | null,
  depthRecov: number | null,
  vesselSuit: number | null
): number | null {
  if (envPriority === null || depthRecov === null || vesselSuit === null) return null;
  return round4(envPriority * depthRecov * vesselSuit);
}

export function haversineKm(a: [number, number], b: [number, number]): number {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const r = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

// Gear hazard evidence table (from 04_norway_gear_family_hazard_v2.csv),
// identical to scripts/spatial_common.py GEAR_CLASSES.
export type GearTier = "DIRECT_BROAD_FAMILY" | "GENERAL_GEAR_ONLY" | "INSUFFICIENT";

export interface GearInfo {
  gearHazardPrior: number | null;
  tier: GearTier;
  sourceLabel: string | null;
  assumption: string;
  observations: number | null;
  catchPositiveRecords: number | null;
}

export const GEAR_CLASSES: Record<string, GearInfo> = {
  FISHING_NET: {
    gearHazardPrior: 0.5008,
    tier: "DIRECT_BROAD_FAMILY",
    sourceLabel: "Norwegian ghost-gear catch observations — net-gear family",
    assumption: "Broad net-family transfer prior",
    observations: 864,
    catchPositiveRecords: 326,
  },
  FISHING_GEAR: {
    gearHazardPrior: 0.3612,
    tier: "GENERAL_GEAR_ONLY",
    sourceLabel: "Pooled baseline across all Norwegian gear-hazard observations",
    assumption: "Material did not match a specific gear family — general gear baseline used",
    observations: null,
    catchPositiveRecords: null,
  },
  GEAR_COMPONENT: {
    gearHazardPrior: null,
    tier: "INSUFFICIENT",
    sourceLabel: null,
    assumption: "No defensible match to catch-observation gear categories for this material",
    observations: null,
    catchPositiveRecords: null,
  },
  UNKNOWN: {
    gearHazardPrior: null,
    tier: "INSUFFICIENT",
    sourceLabel: null,
    assumption: "No defensible match to catch-observation gear categories for this material",
    observations: null,
    catchPositiveRecords: null,
  },
};

// Locale-aware copy for the live-generated explain.why / limitations text and
// the invalid-location error — mirrored from scripts/analyze_report.py's
// MESSAGES dict so the TS and Python engines (if the Python one is ever run
// locally again) produce identical prose.
interface Messages {
  invalidLocation: string;
  tierLabel: Record<GearTier, string>;
  hazardHigh: string;
  hazardModerate: string;
  whyHazard: (level: string, tier: string) => string;
  whyHazardInsufficient: string;
  whyMpaInside: (name: string) => string;
  whyMpaNearest: (name: string, distanceKm: number) => string;
  whyDepth: (depthM: number, recov: number) => string;
  whyCandidates: (count: number) => string;
  whyNoCandidates: string;
  limitations: string[];
}

export const MESSAGES: Record<"en" | "ko", Messages> = {
  en: {
    invalidLocation:
      "Selected location appears to be on land or outside valid bathymetric water coverage. Please choose a marine location.",
    tierLabel: {
      DIRECT_BROAD_FAMILY: "Direct Broad Family",
      GENERAL_GEAR_ONLY: "General Gear",
      INSUFFICIENT: "Insufficient",
    },
    hazardHigh: "High",
    hazardModerate: "Moderate",
    whyHazard: (level, tier) => `${level} gear-hazard evidence (${tier})`,
    whyHazardInsufficient: "Insufficient gear-hazard evidence for the selected material",
    whyMpaInside: (name) => `Inside Marine Protected Area (${name}) covers this point`,
    whyMpaNearest: (name, distanceKm) => `Nearest Marine Protected Area (${name}) is ${distanceKm.toFixed(2)} km away`,
    whyDepth: (depthM, recov) => `Bathymetric proxy depth is ${depthM.toFixed(0)} m (recoverability ${recov.toFixed(3)})`,
    whyCandidates: (count) => `${count} historical vessel candidates found within 10 km`,
    whyNoCandidates: "No historical vessel candidates found within 10 km",
    limitations: [
      "Historical vessel tracks do not indicate real-time availability.",
      "GEBCO depth is a bathymetric proxy, not a measured retrieval depth.",
      "Gear hazard prior is transferred from Norwegian ghost-gear catch evidence.",
      "MPA proximity is an ecological proximity proxy, not measured ecological damage or sensitivity.",
    ],
  },
  ko: {
    invalidLocation: "선택한 위치가 육지이거나 유효한 수심 데이터 범위 밖에 있는 것으로 보입니다. 해상의 위치를 선택해 주세요.",
    tierLabel: {
      DIRECT_BROAD_FAMILY: "직접 어구군 근거",
      GENERAL_GEAR_ONLY: "일반 어구 기준값",
      INSUFFICIENT: "근거 불충분",
    },
    hazardHigh: "높은",
    hazardModerate: "중간 수준의",
    whyHazard: (level, tier) => `${level} 어구 위험도 근거 (${tier})`,
    whyHazardInsufficient: "선택한 재질에 대한 어구 위험도 근거가 불충분합니다",
    whyMpaInside: (name) => `이 지점은 해양보호구역(${name}) 내부에 위치합니다`,
    whyMpaNearest: (name, distanceKm) => `가장 가까운 해양보호구역(${name})까지 ${distanceKm.toFixed(2)}km 거리입니다`,
    whyDepth: (depthM, recov) => `수심 프록시는 ${depthM.toFixed(0)}m입니다 (회수 가능성 ${recov.toFixed(3)})`,
    whyCandidates: (count) => `10km 이내에서 과거 선박 후보 ${count}척이 발견되었습니다`,
    whyNoCandidates: "10km 이내에서 과거 선박 후보를 찾지 못했습니다",
    limitations: [
      "과거 선박 항적은 실시간 가용성을 나타내지 않습니다.",
      "GEBCO 수심은 측정된 인양 수심이 아닌 수심 프록시입니다.",
      "어구 위험도 사전값은 노르웨이 유령어구 어획 근거로부터 전이된 값입니다.",
      "해양보호구역 근접도는 생태적 근접성 프록시이며, 측정된 생태적 피해나 민감도가 아닙니다.",
    ],
  },
};
