import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { project, type Point } from "./geo";
import { haversineKm, routeProximityScore, tonnageCapacityProxy, vesselSuitabilityScore } from "./formulas";

interface VesselRow {
  vesselId: string;
  vesselTonnage: number;
  vesselTypeName: string;
  fishingVesselFlag: string;
  points: [number, number][]; // [lat, lon]
  projPoints: Point[]; // same points pre-projected to EPSG:5179, computed once at load time
}

export interface VesselCandidate {
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

let rowsCache: VesselRow[] | null = null;

async function loadVesselRows(): Promise<VesselRow[]> {
  if (rowsCache) return rowsCache;
  const file = path.join(process.cwd(), "data", "vessel_track_points.json");
  const raw = JSON.parse(await readFile(file, "utf8")) as Omit<VesselRow, "projPoints">[];
  // Projection doesn't depend on the query point, so do it once per row at
  // load time (cached across warm invocations) instead of on every request —
  // this is the dominant cost otherwise (~484k proj4 calls per request).
  rowsCache = raw.map((row) => ({
    ...row,
    projPoints: row.points.map(([lat, lon]) => project([lon, lat])),
  }));
  return rowsCache;
}

const CANDIDATE_RADIUS_M = 10000;
const MAX_CANDIDATES_RETURNED = 20;
const TRACK_CANDIDATES = 5;
const MAX_EDGE_KM = 1.5; // matches export_data.py / analyze_report.py: drop edges spanning large real reporting gaps

function geomMinDistanceM(p: Point, projPoints: Point[]): number {
  if (projPoints.length === 1) return Math.hypot(p[0] - projPoints[0][0], p[1] - projPoints[0][1]);
  let min = Infinity;
  for (let i = 0; i < projPoints.length - 1; i++) {
    const [ax, ay] = projPoints[i];
    const [bx, by] = projPoints[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((p[0] - ax) * dx + (p[1] - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const d = Math.hypot(p[0] - cx, p[1] - cy);
    if (d < min) min = d;
  }
  return min;
}

function extractEdges(points: [number, number][]): [number, number][][] {
  const edges: [number, number][][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (haversineKm(a, b) <= MAX_EDGE_KM) edges.push([a, b]);
  }
  return edges;
}

export async function searchVessels(
  point5179: Point
): Promise<{ total: number; candidates: VesselCandidate[] }> {
  const rows = await loadVesselRows();

  const bestByVessel = new Map<
    string,
    { distanceM: number; vesselTonnage: number; vesselTypeName: string; fishingVesselFlag: string; points: [number, number][] }
  >();
  const rowCounts = new Map<string, number>();

  for (const row of rows) {
    rowCounts.set(row.vesselId, (rowCounts.get(row.vesselId) ?? 0) + 1);
    const d = geomMinDistanceM(point5179, row.projPoints);
    const existing = bestByVessel.get(row.vesselId);
    if (!existing || d < existing.distanceM) {
      bestByVessel.set(row.vesselId, {
        distanceM: d,
        vesselTonnage: row.vesselTonnage,
        vesselTypeName: row.vesselTypeName,
        fishingVesselFlag: row.fishingVesselFlag,
        points: d <= CANDIDATE_RADIUS_M ? row.points : [],
      });
    }
  }

  const candidates: VesselCandidate[] = [];
  for (const [vesselId, v] of bestByVessel) {
    if (v.distanceM > CANDIDATE_RADIUS_M) continue;
    const distanceKm = Math.round((v.distanceM / 1000) * 10000) / 10000;
    candidates.push({
      vesselId,
      vesselTonnage: v.vesselTonnage,
      vesselTypeName: v.vesselTypeName,
      fishingVesselFlag: v.fishingVesselFlag,
      trackRecordCount: rowCounts.get(vesselId) ?? 0,
      distanceKm,
      routeProximityScore: routeProximityScore(distanceKm),
      tonnageCapacityProxy: tonnageCapacityProxy(v.vesselTonnage),
      vesselSuitabilityScore: vesselSuitabilityScore(distanceKm, v.vesselTonnage),
    });
  }
  candidates.sort((a, b) => b.vesselSuitabilityScore - a.vesselSuitabilityScore);

  // Only the top few candidates get their track geometry resolved, to keep
  // the response small (mirrors the demo-scenario export) — but the full
  // candidate count (before trimming) is still returned alongside them.
  for (let i = 0; i < candidates.length && i < TRACK_CANDIDATES; i++) {
    const v = bestByVessel.get(candidates[i].vesselId);
    if (v) {
      const edges = extractEdges(v.points);
      if (edges.length) candidates[i].track = edges;
    }
  }
  return { total: candidates.length, candidates: candidates.slice(0, MAX_CANDIDATES_RETURNED) };
}
