export interface Job {
  jobId: string;
  recoveryDate: string;
  region: string;
  branch: string;
  recoveryVesselType: string;
  materialRaw: string;
  gearClass: string;
  lat: number;
  lon: number;
  bathymetricDepthM: number | null;
  depthRecoverabilityScore: number | null;
  depthRecoverabilityClass: string | null;
  nearestMpaName: string | null;
  nearestMpaType: string | null;
  mpaDistanceKm: number | null;
  insideMpa: boolean;
  mpaProximityScore: number | null;
  gearHazardPrior: number | null;
  gearHazardSource: string | null;
  gearHazardEvidence: string | null;
  environmentalPriorityScore: number | null;
  environmentalPriorityClass: string;
  preliminaryPriority: number | null;
  preliminaryPriorityClass: string | null;
  environmentalRank: number | null;
  preliminaryRank: number | null;
  bestVesselId: string | null;
  bestVesselDistanceKm: number | null;
  bestVesselTonnage: number | null;
  bestVesselSuitability: number | null;
  bestRouteProximityScore: number | null;
  candidateVesselCount: number;
  finalPriority: number | null;
  finalPriorityClass: string;
  finalRank: number | null;
  rankChangeAfterVessel: number | null;
}

export interface Candidate {
  jobId: string;
  vesselId: string;
  distanceKm: number;
  vesselTypeName: string;
  vesselTonnage: number;
  trackRecordCount: number;
  routeProximityScore: number;
  tonnageCapacityProxy: number;
  vesselSuitabilityScore: number;
}

export interface Kpi {
  recoveryJobs: number;
  fullyPrioritized: number;
  jobsWithVesselCandidates: number;
  candidateVesselMatches: number;
  historicalVesselCoveragePct: number;
  avgCandidatesPerJob: number;
  medianCandidatesPerJob: number;
  bestMatchNotNearestPct: number;
  sensitivityScenariosTested: number;
  medianSpearman: number;
  minSpearman: number;
  topJobStableScenarios: number;
  uniqueCandidateVessels: number;
  medianBestVesselDistanceKm: number;
  meanBestVesselDistanceKm: number;
  highestFinalPriorityJob: string;
  highestFinalPriorityScore: number;
  environmentalPriorityScoredJobs: number;
  finalPriorityDistribution: Record<string, number>;
}

export type EvidenceTier = "DIRECT_BROAD_FAMILY" | "GENERAL_GEAR_ONLY" | "INSUFFICIENT";

export interface GearHazardResearch {
  tier: EvidenceTier;
  value: number | null;
  sourceCode: string;
  sourceLabel: string | null;
  assumption: string | null;
  observations: number | null;
  catchPositiveRecords: number | null;
}

export interface MpaProximityResearch {
  value: number | null;
  distanceKm: number | null;
  formula: string;
  source: string;
  spatialMethod: string;
  interpretation: string;
}

export interface MpaProperties {
  mpaId: string;
  mpaName: string;
  mpaType: string;
  designationDate: string | null;
  areaKm2: number | null;
  geometryType: "Polygon" | "MultiPolygon";
  geometryRepaired: boolean;
  sourceYear: number;
}

export interface BathymetricResearch {
  value: number | null;
  depthM: number | null;
  formula: string;
  source: string;
  interpretation: string;
}

export interface VesselSuitabilityResearch {
  formula: string;
  routeFormula: string;
  tonnageFormula: string;
}

export type SensitivityBand = "ROBUST" | "MODERATE" | "SENSITIVE";

export interface SensitivityResearch {
  scenariosScored: number;
  baselineRank: number | null;
  meanRank: number | null;
  medianRank: number | null;
  bestRank: number | null;
  worstRank: number | null;
  rankRange: number | null;
  top10ScenarioCount: number | null;
  top10PresencePct: number | null;
  band: SensitivityBand;
}

export interface JobResearch {
  gearHazard: GearHazardResearch;
  mpaProximity: MpaProximityResearch;
  bathymetric: BathymetricResearch;
  vesselSuitability: VesselSuitabilityResearch;
  sensitivity: SensitivityResearch | null;
}

export interface ScenarioMeta {
  job_id: string;
  title: string;
  summary: string;
  job: Job;
}

export type ScenarioKey = "A" | "B" | "C" | "D";
export type MissionSource = ScenarioKey | "CUSTOM";

export type LiveGearClass = "FISHING_NET" | "FISHING_GEAR" | "GEAR_COMPONENT" | "UNKNOWN";

export interface LiveEnvironmental {
  gearHazardPrior: number | null;
  gearEvidenceTier: EvidenceTier;
  gearSourceLabel: string | null;
  gearAssumption: string | null;
  observations: number | null;
  catchPositiveRecords: number | null;
  mpaProximityScore: number;
  nearestMpaId: string;
  nearestMpaName: string;
  nearestMpaType: string;
  mpaDistanceKm: number;
  insideMpa: boolean;
  environmentalPriority: number | null;
}

export interface LiveCandidate {
  vesselId: string;
  vesselTonnage: number;
  vesselTypeName: string;
  fishingVesselFlag: string;
  trackRecordCount: number;
  distanceKm: number;
  routeProximityScore: number;
  tonnageCapacityProxy: number;
  vesselSuitabilityScore: number;
  track?: [number, number][][];
}

export interface LiveAnalysisResult {
  report: { lat: number; lon: number; gearClass: LiveGearClass };
  environmental: LiveEnvironmental;
  bathymetry: { depthM: number; depthRecoverability: number };
  matching: {
    candidateVesselCount: number;
    candidates: LiveCandidate[];
    bestVessel: LiveCandidate | null;
  };
  final: { finalPriority: number | null };
  explain: { why: string[]; limitations: string[] };
}

export interface LiveAnalysisError {
  error: string;
  message: string;
}

// Each vessel maps to a list of short track edges (pairs of [lat, lon]
// points). Edges reflect real consecutive position reports; edges spanning
// large real-world reporting gaps are excluded at export time rather than
// interpolated, so segments are not guaranteed to connect end-to-end.
export type VesselTracks = Record<string, [number, number][][]>;

export const MISSION_STATES = [
  "REPORTED",
  "VERIFIED",
  "PRIORITIZED",
  "MATCHED",
  "REQUESTED",
  "ACCEPTED",
  "IN_PROGRESS",
  "RECOVERED",
  "VERIFIED_RECOVERY",
  "CLOSED",
] as const;

export type MissionStatus = (typeof MISSION_STATES)[number];

export interface MissionTimeline {
  reported?: string;
  verified?: string;
  prioritized?: string;
  matched?: string;
  requested?: string;
  accepted?: string;
  inProgress?: string;
  recovered?: string;
  verifiedRecovery?: string;
  closed?: string;
}

// Minimal shape StepRecover/StepComplete need — satisfied by both a
// historical Job and a synthetic custom-report subject.
export interface MissionSubject {
  jobId: string;
  materialRaw: string;
  finalPriority: number | null;
}

export interface Mission {
  missionId: string;
  reportId: string;
  scenarioKey: MissionSource;
  jobId: string;
  vesselId: string | null;
  status: MissionStatus;
  createdAt: string;
  timeline: MissionTimeline;
  finalPriority: number | null;
  candidateVesselCount: number;
  bestVesselDistanceKm: number | null;
  circularization?: "Returned to Owner" | "Reused" | "Recycled" | "Disposed" | "Unknown";
  recoveryResult?: "Recovered" | "Partial" | "Failed";
  recoveredWeightKg?: number;
}
