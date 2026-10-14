import "server-only";
import proj4 from "proj4";
import { readFile } from "node:fs/promises";
import path from "node:path";

// EPSG:5179 (Korea 2000 / Unified CS) — verified byte-for-byte against
// pyproj's EPSG:5179 transform for the same reference coordinates.
const DEF_5179 =
  "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";

export type Point = [number, number]; // [x, y] in whatever CRS context implies

// Build the converter once — proj4 re-parses the PROJ string on every call
// otherwise, which dominates runtime when projecting hundreds of thousands
// of vessel-track points per request.
const converter = proj4("EPSG:4326", DEF_5179);

export function project([lon, lat]: [number, number]): Point {
  return converter.forward([lon, lat]) as Point;
}

function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function ringDistance(p: Point, ring: Point[]): number {
  let min = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const d = pointToSegmentDistance(p, ring[i], ring[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

function pointInRing(p: Point, ring: Point[]): boolean {
  let inside = false;
  const [x, y] = p;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function polygonContains(p: Point, projRings: Point[][]): boolean {
  if (!pointInRing(p, projRings[0])) return false;
  for (let i = 1; i < projRings.length; i++) {
    if (pointInRing(p, projRings[i])) return false; // inside a hole
  }
  return true;
}

function polygonDistance(p: Point, projRings: Point[][]): { distanceM: number; inside: boolean } {
  if (projRings.length === 0) return { distanceM: Infinity, inside: false };
  if (polygonContains(p, projRings)) return { distanceM: 0, inside: true };
  let min = Infinity;
  for (const ring of projRings) min = Math.min(min, ringDistance(p, ring));
  return { distanceM: min, inside: false };
}

// Geometry pre-projected to EPSG:5179 at load time (projection doesn't
// depend on the query point, so there is no reason to redo it per request).
type ProjGeometry = { type: "Polygon"; rings: Point[][] } | { type: "MultiPolygon"; polygons: Point[][][] };

export interface MpaFeature {
  mpaId: string;
  mpaName: string;
  mpaType: string;
  geometry: ProjGeometry;
}

function geometryDistance(p: Point, geometry: ProjGeometry): { distanceM: number; inside: boolean } {
  if (geometry.type === "Polygon") {
    return polygonDistance(p, geometry.rings);
  }
  if (!geometry.polygons.length) return { distanceM: Infinity, inside: false };
  let best: { distanceM: number; inside: boolean } = { distanceM: Infinity, inside: false };
  for (const poly of geometry.polygons) {
    const r = polygonDistance(p, poly);
    if (r.inside) return r;
    if (r.distanceM < best.distanceM) best = r;
  }
  return best;
}

interface RawMpaGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: [number, number][][] | [number, number][][][];
}

function projectGeometry(geometry: RawMpaGeometry): ProjGeometry {
  const projRing = (ring: [number, number][]) => ring.map(([lon, lat]) => project([lon, lat]));
  if (geometry.type === "Polygon") {
    return { type: "Polygon", rings: (geometry.coordinates as [number, number][][]).map(projRing) };
  }
  return {
    type: "MultiPolygon",
    polygons: (geometry.coordinates as [number, number][][][]).map((poly) => poly.map(projRing)),
  };
}

let mpaCache: MpaFeature[] | null = null;

export async function loadMpaPolygons(): Promise<MpaFeature[]> {
  if (mpaCache) return mpaCache;
  const file = path.join(process.cwd(), "data", "mpa_polygons.json");
  const raw = JSON.parse(await readFile(file, "utf8")) as {
    features: { properties: { mpaId: string; mpaName: string; mpaType: string }; geometry: RawMpaGeometry }[];
  };
  mpaCache = raw.features.map((f) => ({ ...f.properties, geometry: projectGeometry(f.geometry) }));
  return mpaCache;
}

export async function nearestMpa(
  point5179: Point
): Promise<{ mpa: MpaFeature; distanceM: number; inside: boolean }> {
  const polygons = await loadMpaPolygons();
  let best: { mpa: MpaFeature; distanceM: number; inside: boolean } | null = null;
  for (const mpa of polygons) {
    const r = geometryDistance(point5179, mpa.geometry);
    if (!best || r.distanceM < best.distanceM) best = { mpa, ...r };
  }
  if (!best) throw new Error("No MPA polygons loaded.");
  if (best.inside) best.distanceM = 0;
  return best;
}
