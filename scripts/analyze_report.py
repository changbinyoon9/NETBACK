#!/usr/bin/env python3
"""
NETBACK live spatial analysis engine.

Runs the exact NETBACK Priority Model v1 pipeline (same formulas, same MPA
polygon set, same GEBCO raster, same vessel-track geometry) against an
arbitrary marine coordinate, instead of one of the 178 pre-scored historical
jobs. Invoked as a subprocess from the Next.js API route at
app/api/analyze-report/route.ts.

Usage:
    python3 analyze_report.py '{"lat": 34.8, "lon": 128.4, "gearClass": "FISHING_NET"}'

Prints a single JSON object to stdout. On success it has a "report" key;
on failure (invalid location, bad input) it has an "error" key instead.
"""
import csv
import json
import sys
from pathlib import Path

csv.field_size_limit(sys.maxsize)

from pyproj import Transformer
from shapely import wkb
from shapely.geometry import Point
from shapely.ops import transform as shp_transform
import rasterio

sys.path.insert(0, str(Path(__file__).resolve().parent))
from spatial_common import (
    GEAR_CLASSES,
    depth_recoverability,
    environmental_priority,
    final_priority,
    haversine_km,
    load_mpa_polygons,
    mpa_proximity_score,
    route_proximity_score,
    tonnage_capacity_proxy,
    vessel_suitability_score,
)

ROOT = Path(__file__).resolve().parents[2]
RAW_MPA_FILE = ROOT / "Data" / "해양환경공단_해양보호구역 공간정보_20240910.csv"
RAW_VESSEL_TRACKS = ROOT / "Data" / "해양수산부_(융합)어선 항적도_20240221.csv"
GEBCO_FILE = (
    ROOT / "Data" / "GEBCO_16_Sep_2026_143fbeb870ac" / "gebco_2026_n40.0_s32.0_w124.0_e133.0_geotiff.tif"
)

CANDIDATE_RADIUS_M = 10000.0
MAX_CANDIDATES_RETURNED = 20  # top-N by suitability sent back to the client
TRACK_CANDIDATES = 5  # top-N that also get track geometry resolved

# Locale-aware copy for the live-generated explain.why / limitations text and
# the invalid-location error. Everything else in this module (field names,
# gear tiers, source labels) is structured data consumed by the already
# i18n'd frontend, not prose, so it stays untranslated here.
MESSAGES = {
    "en": {
        "invalid_location": (
            "Selected location appears to be on land or outside valid "
            "bathymetric water coverage. Please choose a marine location."
        ),
        "tier_label": {
            "DIRECT_BROAD_FAMILY": "Direct Broad Family",
            "GENERAL_GEAR_ONLY": "General Gear",
            "INSUFFICIENT": "Insufficient",
        },
        "hazard_high": "High",
        "hazard_moderate": "Moderate",
        "why_hazard": "{level} gear-hazard evidence ({tier})",
        "why_hazard_insufficient": "Insufficient gear-hazard evidence for the selected material",
        "why_mpa_inside": "Inside Marine Protected Area ({name}) covers this point",
        "why_mpa_nearest": "Nearest Marine Protected Area ({name}) is {distance:.2f} km away",
        "why_depth": "Bathymetric proxy depth is {depth:.0f} m (recoverability {recov:.3f})",
        "why_candidates": "{count} historical vessel candidates found within 10 km",
        "why_no_candidates": "No historical vessel candidates found within 10 km",
        "limitations": [
            "Historical vessel tracks do not indicate real-time availability.",
            "GEBCO depth is a bathymetric proxy, not a measured retrieval depth.",
            "Gear hazard prior is transferred from Norwegian ghost-gear catch evidence.",
            "MPA proximity is an ecological proximity proxy, not measured ecological damage or sensitivity.",
        ],
    },
    "ko": {
        "invalid_location": (
            "선택한 위치가 육지이거나 유효한 수심 데이터 범위 밖에 있는 것으로 보입니다. "
            "해상의 위치를 선택해 주세요."
        ),
        "tier_label": {
            "DIRECT_BROAD_FAMILY": "직접 어구군 근거",
            "GENERAL_GEAR_ONLY": "일반 어구 기준값",
            "INSUFFICIENT": "근거 불충분",
        },
        "hazard_high": "높은",
        "hazard_moderate": "중간 수준의",
        "why_hazard": "{level} 어구 위험도 근거 ({tier})",
        "why_hazard_insufficient": "선택한 재질에 대한 어구 위험도 근거가 불충분합니다",
        "why_mpa_inside": "이 지점은 해양보호구역({name}) 내부에 위치합니다",
        "why_mpa_nearest": "가장 가까운 해양보호구역({name})까지 {distance:.2f}km 거리입니다",
        "why_depth": "수심 프록시는 {depth:.0f}m입니다 (회수 가능성 {recov:.3f})",
        "why_candidates": "10km 이내에서 과거 선박 후보 {count}척이 발견되었습니다",
        "why_no_candidates": "10km 이내에서 과거 선박 후보를 찾지 못했습니다",
        "limitations": [
            "과거 선박 항적은 실시간 가용성을 나타내지 않습니다.",
            "GEBCO 수심은 측정된 인양 수심이 아닌 수심 프록시입니다.",
            "어구 위험도 사전값은 노르웨이 유령어구 어획 근거로부터 전이된 값입니다.",
            "해양보호구역 근접도는 생태적 근접성 프록시이며, 측정된 생태적 피해나 민감도가 아닙니다.",
        ],
    },
}

_to_5179 = Transformer.from_crs("EPSG:4326", "EPSG:5179", always_xy=True).transform


def project(geom):
    return shp_transform(_to_5179, geom)


def sample_depth(lat, lon):
    with rasterio.open(GEBCO_FILE) as src:
        value = list(src.sample([(lon, lat)]))[0][0]
    return float(value)


def nearest_mpa(point_5179):
    polygons = load_mpa_polygons(RAW_MPA_FILE)
    best = None
    best_dist_m = None
    best_inside = False
    for p in polygons:
        geom_5179 = project(p["geometry"])
        d = geom_5179.distance(point_5179)
        if best_dist_m is None or d < best_dist_m:
            best_dist_m = d
            best = p
            best_inside = geom_5179.covers(point_5179)
    if best_inside:
        best_dist_m = 0.0
    return best, best_dist_m, best_inside


MAX_EDGE_KM = 1.5  # matches export_data.py: drop edges spanning large real reporting gaps


def _extract_edges(geom):
    """Pulls [[lat,lon],[lat,lon]] edges out of a MultiLineString/LineString,
    matching the vessel_tracks.json export format, filtering out edges that
    span implausible real-world reporting gaps rather than local movement."""
    lines = list(geom.geoms) if geom.geom_type == "MultiLineString" else [geom]
    edges = []
    for line in lines:
        coords = list(line.coords)
        for i in range(len(coords) - 1):
            (lon1, lat1), (lon2, lat2) = coords[i], coords[i + 1]
            if haversine_km((lat1, lon1), (lat2, lon2)) <= MAX_EDGE_KM:
                edges.append([[round(lat1, 6), round(lon1, 6)], [round(lat2, 6), round(lon2, 6)]])
    return edges


def search_vessels(point_5179):
    """Groups raw track rows by vessel_id (matching the research notebook's
    unary_union-per-vessel step) and keeps the minimum distance per vessel."""
    best_by_vessel = {}
    row_counts = {}  # vessel_id -> number of raw rows seen (tracked separately
    # so it survives a closer row replacing the best-distance entry below)
    with open(RAW_VESSEL_TRACKS, encoding="cp949", newline="") as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            vessel_id = row[1]
            fishing_flag = row[2]
            vessel_type_name = row[3]
            try:
                tonnage = float(row[6])
            except (ValueError, IndexError):
                continue
            try:
                geom = wkb.loads(bytes.fromhex(row[7]))
            except Exception:
                continue
            row_counts[vessel_id] = row_counts.get(vessel_id, 0) + 1
            geom_5179 = project(geom)
            d = geom_5179.distance(point_5179)
            existing = best_by_vessel.get(vessel_id)
            if existing is None or d < existing["distance_m"]:
                best_by_vessel[vessel_id] = {
                    "vesselId": vessel_id,
                    "distance_m": d,
                    "vesselTonnage": tonnage,
                    "vesselTypeName": vessel_type_name,
                    "fishingVesselFlag": fishing_flag,
                    "_geom": geom if d <= CANDIDATE_RADIUS_M else None,
                }

    for vessel_id, entry in best_by_vessel.items():
        entry["trackRecordCount"] = row_counts[vessel_id]

    candidates = [v for v in best_by_vessel.values() if v["distance_m"] <= CANDIDATE_RADIUS_M]
    for c in candidates:
        distance_km = c["distance_m"] / 1000
        c["distanceKm"] = round(distance_km, 4)
        c["routeProximityScore"] = route_proximity_score(distance_km)
        c["tonnageCapacityProxy"] = tonnage_capacity_proxy(c["vesselTonnage"])
        c["vesselSuitabilityScore"] = vessel_suitability_score(distance_km, c["vesselTonnage"])
        del c["distance_m"]
    candidates.sort(key=lambda c: c["vesselSuitabilityScore"], reverse=True)

    # Only the top few candidates get their track geometry resolved and
    # returned, to keep the response small (mirrors the demo-scenario export).
    for i, c in enumerate(candidates):
        if i < TRACK_CANDIDATES and c["_geom"] is not None:
            c["track"] = _extract_edges(c["_geom"])
        del c["_geom"]

    return candidates


def analyze(lat, lon, gear_class, locale="en"):
    msg = MESSAGES.get(locale, MESSAGES["en"])
    depth_m_source = sample_depth(lat, lon)
    if depth_m_source >= 0:
        return {
            "error": "INVALID_LOCATION",
            "message": msg["invalid_location"],
        }
    depth_m = -depth_m_source
    depth_recov = depth_recoverability(depth_m)

    point_4326 = Point(lon, lat)
    point_5179 = project(point_4326)

    mpa, mpa_dist_m, mpa_inside = nearest_mpa(point_5179)
    mpa_distance_km = mpa_dist_m / 1000
    mpa_score = mpa_proximity_score(mpa_distance_km, mpa_inside)

    gear_info = GEAR_CLASSES.get(gear_class, GEAR_CLASSES["UNKNOWN"])
    gear_hazard_prior = gear_info["gearHazardPrior"]
    env_priority = environmental_priority(gear_hazard_prior, mpa_score)

    candidates = search_vessels(point_5179)
    best_vessel = candidates[0] if candidates else None
    vessel_suit = best_vessel["vesselSuitabilityScore"] if best_vessel else None

    final = final_priority(env_priority, depth_recov, vessel_suit)

    why = []
    if gear_hazard_prior is not None:
        level = msg["hazard_high"] if gear_hazard_prior >= 0.5 else msg["hazard_moderate"]
        tier_label = msg["tier_label"].get(gear_info["tier"], gear_info["tier"])
        why.append(msg["why_hazard"].format(level=level, tier=tier_label))
    else:
        why.append(msg["why_hazard_insufficient"])
    if mpa_inside:
        why.append(msg["why_mpa_inside"].format(name=mpa["mpaName"]))
    else:
        why.append(msg["why_mpa_nearest"].format(name=mpa["mpaName"], distance=mpa_distance_km))
    why.append(msg["why_depth"].format(depth=depth_m, recov=depth_recov))
    if candidates:
        why.append(msg["why_candidates"].format(count=len(candidates)))
    else:
        why.append(msg["why_no_candidates"])

    return {
        "report": {"lat": lat, "lon": lon, "gearClass": gear_class},
        "environmental": {
            "gearHazardPrior": gear_hazard_prior,
            "gearEvidenceTier": gear_info["tier"],
            "gearSourceLabel": gear_info["sourceLabel"],
            "gearAssumption": gear_info["assumption"],
            "observations": gear_info["observations"],
            "catchPositiveRecords": gear_info["catchPositiveRecords"],
            "mpaProximityScore": mpa_score,
            "nearestMpaId": mpa["mpaId"],
            "nearestMpaName": mpa["mpaName"],
            "nearestMpaType": mpa["mpaType"],
            "mpaDistanceKm": round(mpa_distance_km, 4),
            "insideMpa": mpa_inside,
            "environmentalPriority": env_priority,
        },
        "bathymetry": {
            "depthM": round(depth_m, 2),
            "depthRecoverability": depth_recov,
        },
        "matching": {
            "candidateVesselCount": len(candidates),
            "candidates": candidates[:MAX_CANDIDATES_RETURNED],
            "bestVessel": best_vessel,
        },
        "final": {
            "finalPriority": final,
        },
        "explain": {
            "why": why,
            "limitations": msg["limitations"],
        },
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "BAD_INPUT", "message": "Missing input payload."}))
        return
    try:
        payload = json.loads(sys.argv[1])
        lat = float(payload["lat"])
        lon = float(payload["lon"])
        gear_class = str(payload.get("gearClass", "UNKNOWN"))
        locale = str(payload.get("locale", "en"))
        if locale not in MESSAGES:
            locale = "en"
    except Exception as e:
        print(json.dumps({"error": "BAD_INPUT", "message": str(e)}))
        return

    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        print(json.dumps({"error": "BAD_INPUT", "message": "Coordinates out of range."}))
        return

    try:
        result = analyze(lat, lon, gear_class, locale)
    except Exception as e:
        print(json.dumps({"error": "ANALYSIS_FAILED", "message": str(e)}))
        return

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
