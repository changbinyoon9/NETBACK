"""
NETBACK data export pipeline.

Reads the processed research outputs from ../../Data/processed (and the raw
vessel-track file for the 4 demo scenarios) and writes static JSON the web
prototype reads at runtime. Run with: python3 scripts/export_data.py
"""
import csv
import json
import math
import re
import statistics
import sys

import struct
import binascii
from pathlib import Path

from shapely import wkt
from shapely.geometry import Polygon, mapping

csv.field_size_limit(sys.maxsize)

ROOT = Path(__file__).resolve().parents[2]
PROC = ROOT / "Data" / "processed"
RAW_VESSEL_TRACKS = ROOT / "Data" / "해양수산부_(융합)어선 항적도_20240221.csv"
# Same 2024 KOEM MPA spatial file used for the boundary-distance analysis
# that produced mpa_distance_km / mpa_proximity_score in the job dataset.
# (The 2025 file is point-only and is not used here.)
RAW_MPA_FILE = ROOT / "Data" / "해양환경공단_해양보호구역 공간정보_20240910.csv"
OUT = Path(__file__).resolve().parents[1] / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)

DEMO_SCENARIOS = {
    "A": {
        "job_id": "KR-00394",
        "title": "High Priority / High Feasibility",
        "summary": "Shallow lost net near a protected-area context with strong vessel access.",
    },
    "B": {
        "job_id": "KR-00325",
        "title": "High Environmental Priority / Harder Recovery",
        "summary": "Environmentally important, but operationally more difficult.",
    },
    "C": {
        "job_id": "KR-00052",
        "title": "Vessel Constraint",
        "summary": "Initially high priority, but weaker vessel suitability reduces operational priority.",
    },
    "D": {
        "job_id": "KR-00001",
        "title": "Insufficient Evidence",
        "summary": "NETBACK refuses to generate an unsupported ecological priority.",
    },
}


def to_float(v):
    if v is None or v == "" or v == "NOT_SCORED":
        return None
    try:
        f = float(v)
        if math.isnan(f):
            return None
        return f
    except ValueError:
        return None


def to_bool(v):
    return str(v).strip().lower() == "true"


def read_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


# ---------------------------------------------------------------------------
# 1. jobs.json
# ---------------------------------------------------------------------------
def build_jobs():
    rows = read_csv(PROC / "08_netback_final_recovery_priority.csv")
    jobs = []
    for r in rows:
        jobs.append({
            "jobId": r["job_id"],
            "recoveryDate": r["recovery_date"],
            "region": r["region"],
            "branch": r["branch"],
            "recoveryVesselType": r["recovery_vessel_type"],
            "materialRaw": r["material_raw"],
            "gearClass": r["event_gear_class"],
            "lat": to_float(r["lat"]),
            "lon": to_float(r["lon"]),
            "bathymetricDepthM": to_float(r["bathymetric_depth_m"]),
            "depthRecoverabilityScore": to_float(r["depth_recoverability_score"]),
            "depthRecoverabilityClass": r["depth_recoverability_class"] or None,
            "nearestMpaName": r["nearest_mpa_name"] or None,
            "nearestMpaType": r["nearest_mpa_type"] or None,
            "mpaDistanceKm": to_float(r["mpa_distance_km"]),
            "insideMpa": to_bool(r["inside_mpa"]),
            "mpaProximityScore": to_float(r["mpa_proximity_score"]),
            "gearHazardPrior": to_float(r["gear_hazard_prior"]),
            "gearHazardSource": r["gear_hazard_source"] or None,
            "gearHazardEvidence": r["gear_hazard_evidence"] or None,
            "environmentalPriorityScore": to_float(r["environmental_priority_score"]),
            "environmentalPriorityClass": r["environmental_priority_class"] or "NOT_SCORED",
            "preliminaryPriority": to_float(r["preliminary_recovery_priority"]),
            "preliminaryPriorityClass": r["preliminary_priority_class"] or None,
            "environmentalRank": to_float(r["environmental_rank"]),
            "preliminaryRank": to_float(r["preliminary_rank"]),
            "bestVesselId": r["best_vessel_id"] or None,
            "bestVesselDistanceKm": to_float(r["best_vessel_distance_km"]),
            "bestVesselTonnage": to_float(r["best_vessel_tonnage"]),
            "bestVesselSuitability": to_float(r["best_vessel_suitability_score"]),
            "bestRouteProximityScore": to_float(r["best_route_proximity_score"]),
            "candidateVesselCount": int(to_float(r["candidate_vessel_count_10km"]) or 0),
            "finalPriority": to_float(r["final_netback_priority_score"]),
            "finalPriorityClass": r["final_netback_priority_class"] or "NOT_SCORED",
            "finalRank": to_float(r["final_netback_rank"]),
            "rankChangeAfterVessel": to_float(r["rank_change_after_vessel"]),
        })
    (OUT / "jobs.json").write_text(json.dumps(jobs, ensure_ascii=False), encoding="utf-8")
    print(f"jobs.json: {len(jobs)} jobs")
    return jobs


# ---------------------------------------------------------------------------
# 2. candidates.json
# ---------------------------------------------------------------------------
def build_candidates():
    rows = read_csv(PROC / "08_vessel_candidate_suitability.csv")
    cands = []
    for r in rows:
        cands.append({
            "jobId": r["job_id"],
            "vesselId": r["vessel_id"],
            "distanceKm": to_float(r["distance_km"]),
            "vesselTypeName": r["vessel_type_name"],
            "vesselTonnage": to_float(r["vessel_tonnage"]),
            "trackRecordCount": int(to_float(r["track_record_count"]) or 0),
            "routeProximityScore": to_float(r["route_proximity_score"]),
            "tonnageCapacityProxy": to_float(r["tonnage_capacity_proxy"]),
            "vesselSuitabilityScore": to_float(r["vessel_suitability_score"]),
        })
    (OUT / "candidates.json").write_text(json.dumps(cands, ensure_ascii=False), encoding="utf-8")
    print(f"candidates.json: {len(cands)} candidate pairs")
    return cands


# ---------------------------------------------------------------------------
# 3. kpi.json
# ---------------------------------------------------------------------------
def build_kpi(jobs, cands):
    summary = {r["metric"]: r["value"] for r in read_csv(PROC / "10_netback_key_results_summary.csv")}
    sensitivity = {r["metric"]: r["value"] for r in read_csv(PROC / "sensitivity" / "11_sensitivity_summary.csv")}

    per_job_counts = {}
    for c in cands:
        per_job_counts[c["jobId"]] = per_job_counts.get(c["jobId"], 0) + 1
    counts = list(per_job_counts.values())

    total_jobs = len(jobs)
    jobs_with_candidates = sum(1 for j in jobs if j["candidateVesselCount"] > 0)
    fully_prioritized = sum(1 for j in jobs if j["finalPriorityClass"] != "NOT_SCORED")

    kpi = {
        "recoveryJobs": total_jobs,
        "fullyPrioritized": fully_prioritized,
        "jobsWithVesselCandidates": jobs_with_candidates,
        "candidateVesselMatches": len(cands),
        "historicalVesselCoveragePct": round(100 * jobs_with_candidates / total_jobs, 1),
        "avgCandidatesPerJob": round(statistics.mean(counts), 1) if counts else 0,
        "medianCandidatesPerJob": round(statistics.median(counts), 1) if counts else 0,
        "bestMatchNotNearestPct": round(100 * float(summary["Share where best vessel differed from nearest vessel"]), 1),
        "sensitivityScenariosTested": int(float(sensitivity["Parameter scenarios tested"])),
        "medianSpearman": round(float(sensitivity["Median Spearman correlation vs baseline"]), 4),
        "minSpearman": round(float(sensitivity["Minimum Spearman correlation vs baseline"]), 4),
        "topJobStableScenarios": int(float(sensitivity["Scenarios won by most frequent #1 job"])),
        "uniqueCandidateVessels": len({c["vesselId"] for c in cands}),
        "medianBestVesselDistanceKm": round(float(summary["Median best-vessel historical track distance (km)"]), 3),
        "meanBestVesselDistanceKm": round(float(summary["Mean best-vessel historical track distance (km)"]), 3),
        "highestFinalPriorityJob": summary["Highest-priority recovery job"],
        "highestFinalPriorityScore": round(float(summary["Highest final NETBACK priority score"]), 4),
        "environmentalPriorityScoredJobs": int(float(summary["Environmental priority scored"])),
    }

    # priority class distribution (final)
    dist = {}
    for j in jobs:
        cls = j["finalPriorityClass"] or "NOT_SCORED"
        dist[cls] = dist.get(cls, 0) + 1
    kpi["finalPriorityDistribution"] = dist

    (OUT / "kpi.json").write_text(json.dumps(kpi, ensure_ascii=False, indent=2), encoding="utf-8")
    print("kpi.json written")


# ---------------------------------------------------------------------------
# 4. vessel_tracks.json  (only for vessels candidate to the 4 demo jobs)
# ---------------------------------------------------------------------------
def parse_ewkb_multilinestring(b):
    off = 0
    byte_order = b[off]; off += 1
    if byte_order != 1:
        raise ValueError("only little-endian WKB supported")
    gtype = struct.unpack_from('<I', b, off)[0]; off += 4
    has_srid = bool(gtype & 0x20000000)
    base_type = gtype & 0xff
    if has_srid:
        off += 4  # skip SRID
    if base_type != 5:
        return []
    num_lines = struct.unpack_from('<I', b, off)[0]; off += 4
    lines = []
    for _ in range(num_lines):
        off += 1  # sub byte order
        ltype = struct.unpack_from('<I', b, off)[0]; off += 4
        npts = struct.unpack_from('<I', b, off)[0]; off += 4
        pts = []
        for _ in range(npts):
            x, y = struct.unpack_from('<dd', b, off); off += 16
            pts.append((round(y, 6), round(x, 6)))  # -> [lat, lon]
        lines.append(pts)
    return lines


def haversine_km(p1, p2):
    lat1, lon1 = p1
    lat2, lon2 = p2
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return 2 * r * math.asin(math.sqrt(a))


# The raw geometry stores each vessel's track as a MultiLineString of short
# 2-point edges (consecutive AIS-style pings), not one continuous path. Most
# edges are short (tens to a few hundred metres) and chain together, but a
# handful span large real-world reporting gaps. Rather than connecting every
# edge (which can draw a straight line across land for a single big gap) or
# collapsing to one arbitrary edge, we keep every edge that is plausibly a
# real local movement and drop only edges longer than this threshold — the
# visualization then reflects gaps in reporting rather than inventing a route.
MAX_EDGE_KM = 1.5
MAX_EDGES_PER_VESSEL = 220


def build_vessel_tracks(cands):
    demo_job_ids = {v["job_id"] for v in DEMO_SCENARIOS.values()}
    by_job = {}
    for c in cands:
        if c["jobId"] in demo_job_ids:
            by_job.setdefault(c["jobId"], []).append(c)

    wanted_vessel_ids = set()
    for job_id, job_cands in by_job.items():
        job_cands.sort(key=lambda c: c["vesselSuitabilityScore"] or 0, reverse=True)
        for c in job_cands[:15]:
            wanted_vessel_ids.add(c["vesselId"])

    print(f"Scanning raw vessel-track file for {len(wanted_vessel_ids)} candidate vessels...")
    tracks = {}
    with open(RAW_VESSEL_TRACKS, encoding="cp949", newline="") as f:
        reader = csv.reader(f)
        next(reader)  # header
        for row in reader:
            vessel_id = row[1]
            if vessel_id not in wanted_vessel_ids or vessel_id in tracks:
                continue
            geom_hex = row[7]
            try:
                b = binascii.unhexlify(geom_hex)
                lines = parse_ewkb_multilinestring(b)
            except Exception:
                continue
            if not lines:
                continue
            edges = [edge for edge in lines if haversine_km(edge[0], edge[1]) <= MAX_EDGE_KM]
            if not edges:
                continue
            if len(edges) > MAX_EDGES_PER_VESSEL:
                step = len(edges) / MAX_EDGES_PER_VESSEL
                edges = [edges[int(i * step)] for i in range(MAX_EDGES_PER_VESSEL)]
            tracks[vessel_id] = edges
            if len(tracks) >= len(wanted_vessel_ids):
                break

    (OUT / "vessel_tracks.json").write_text(json.dumps(tracks, ensure_ascii=False), encoding="utf-8")
    print(f"vessel_tracks.json: {len(tracks)}/{len(wanted_vessel_ids)} vessel tracks resolved")


# ---------------------------------------------------------------------------
# 5. marine_protected_areas.geojson
#
# Mirrors the exact parsing/repair pipeline used in the research notebook
# (Preprocessing.ipynb, "MPA SPATIAL DATA PREPROCESSING" cell) so the web
# export is the same 37-polygon set used to compute mpa_distance_km /
# mpa_proximity_score for the 178 jobs. POINT rows (representative MPA
# location markers, not boundaries) are excluded, matching the notebook.
# ---------------------------------------------------------------------------
def parse_mpa_geometry(text, geom_type):
    """Returns (shapely geometry | None, wkt_repair_branch | None)."""
    if text is None or text == "":
        return None, None
    text = str(text).strip()
    if text.startswith("Polygon"):
        text = "POLYGON" + text[len("Polygon"):]
    if text.startswith("MultiPolygon"):
        text = "MULTIPOLYGON" + text[len("MultiPolygon"):]
    if text.startswith("Point"):
        text = "POINT" + text[len("Point"):]

    try:
        return wkt.loads(text), "A"
    except Exception:
        pass

    # A single polygon with one extra nested paren: POLYGON (((...))) -> POLYGON ((...))
    if text.startswith("POLYGON ((("):
        repaired = text.replace("POLYGON (((", "POLYGON ((", 1)
        while repaired.endswith(")))"):
            repaired = repaired[:-1]
        try:
            return wkt.loads(repaired), "B"
        except Exception:
            pass

    # Multiple rings mis-tagged as POLYGON: POLYGON ((...)),((...)) -> MULTIPOLYGON
    if text.startswith("POLYGON") and ")),((" in text:
        body = text[len("POLYGON"):].strip()
        repaired = "MULTIPOLYGON (" + body + ")"
        try:
            return wkt.loads(repaired), "C"
        except Exception:
            pass

    # Last resort: pull raw coordinate pairs out of malformed WKT text.
    if str(geom_type).lower() == "polygon":
        coord_pairs = re.findall(r"(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)", text)
        coords = [(float(lon), float(lat)) for lon, lat in coord_pairs]
        if len(coords) >= 3:
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            try:
                p = Polygon(coords)
                if not p.is_empty:
                    return p, "D"
            except Exception:
                pass

    return None, None


def round_coords(geom_dict, digits=5):
    def round_ring(ring):
        return [[round(x, digits), round(y, digits)] for x, y in ring]

    if geom_dict["type"] == "Polygon":
        geom_dict["coordinates"] = [round_ring(r) for r in geom_dict["coordinates"]]
    else:  # MultiPolygon
        geom_dict["coordinates"] = [[round_ring(r) for r in poly] for poly in geom_dict["coordinates"]]
    return geom_dict


def build_mpa():
    with open(RAW_MPA_FILE, encoding="cp949", newline="") as f:
        rows = list(csv.DictReader(f))
    features = []
    n_point = 0
    for r in rows:
        geom, branch = parse_mpa_geometry(r["GEO_JSON"], r["형태"])
        if geom is None:
            continue
        if geom.geom_type == "Point":
            n_point += 1
            continue

        wkt_repaired = branch != "A"
        valid_repaired = False
        if not geom.is_valid:
            geom = geom.buffer(0)
            valid_repaired = True

        if geom.geom_type not in ("Polygon", "MultiPolygon"):
            continue

        geom = geom.simplify(0.0002, preserve_topology=True)
        geom_dict = round_coords(mapping(geom))

        features.append({
            "type": "Feature",
            "properties": {
                "mpaId": r["보호구역 ID"],
                "mpaName": r["보호구역명"],
                "mpaType": r["보호구역 구분"],
                "designationDate": r["보호구역 지정일자"] or None,
                "areaKm2": to_float(r["면적"]),
                "geometryType": geom.geom_type,
                "geometryRepaired": bool(wkt_repaired or valid_repaired),
                "sourceYear": 2024,
            },
            "geometry": geom_dict,
        })

    fc = {"type": "FeatureCollection", "features": features}
    (OUT / "marine_protected_areas.geojson").write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
    repaired_count = sum(1 for f in features if f["properties"]["geometryRepaired"])
    print(
        f"marine_protected_areas.geojson: {len(features)} polygon/multipolygon features "
        f"({repaired_count} repaired, {n_point} point-only records excluded)"
    )


# ---------------------------------------------------------------------------
# 6. research.json — Research Mode: evidence tiers, formulas, sensitivity
# ---------------------------------------------------------------------------
GEAR_HAZARD_SOURCE_INFO = {
    "NORWAY_NET_FAMILY": {
        "label": "Norwegian ghost-gear catch observations — net-gear family",
        "assumption": "Broad net-family transfer prior",
    },
    "NORWAY_ALL_GEAR_BASELINE": {
        "label": "Pooled baseline across all Norwegian gear-hazard observations",
        "assumption": "Material did not match a specific gear family — general gear baseline used",
    },
    "NO_DEFENSIBLE_GEAR_MATCH": {
        "label": None,
        "assumption": "No defensible match to catch-observation gear categories for this material",
    },
}

# gear_family_hazard_v2.csv observation counts, keyed by the evidence source
# code used in the main job table (NORWAY_NET_FAMILY -> NET_FAMILY row).
GEAR_FAMILY_SOURCE_TO_ROW = {
    "NORWAY_NET_FAMILY": "NET_FAMILY",
}


def build_research(jobs):
    family_rows = {r["gear_family"]: r for r in read_csv(PROC / "04_norway_gear_family_hazard_v2.csv")}

    rank_stability = {
        r["job_id"]: r for r in read_csv(PROC / "sensitivity" / "11_sensitivity_job_rank_stability.csv")
    }
    top10_stability = {
        r["job_id"]: r for r in read_csv(PROC / "sensitivity" / "11_sensitivity_baseline_top10_stability.csv")
    }

    research = {}
    for j in jobs:
        job_id = j["jobId"]

        # --- Gear hazard evidence -------------------------------------------------
        source = j["gearHazardSource"]
        info = GEAR_HAZARD_SOURCE_INFO.get(source, {"label": None, "assumption": None})
        family_row = family_rows.get(GEAR_FAMILY_SOURCE_TO_ROW.get(source))
        gear_hazard = {
            "tier": j["gearHazardEvidence"],  # DIRECT_BROAD_FAMILY / GENERAL_GEAR_ONLY / INSUFFICIENT
            "value": j["gearHazardPrior"],
            "sourceCode": source,
            "sourceLabel": info["label"],
            "assumption": info["assumption"],
            "observations": to_float(family_row["observations"]) if family_row else None,
            "catchPositiveRecords": to_float(family_row["catch_positive_records"]) if family_row else None,
        }

        # --- MPA proximity ---------------------------------------------------------
        mpa_proximity = {
            "value": j["mpaProximityScore"],
            "distanceKm": j["mpaDistanceKm"],
            "formula": "0.10 + 0.90 × exp(-distance_km / 5)",
            "source": "Korean Marine Protected Area spatial data (2024)",
            "spatialMethod": "Minimum distance to nearest polygon boundary",
            "interpretation": "Ecological proximity proxy, not measured ecological damage or sensitivity.",
        }

        # --- Bathymetric recoverability ---------------------------------------------
        bathymetric = {
            "value": j["depthRecoverabilityScore"],
            "depthM": j["bathymetricDepthM"],
            "formula": "exp(-depth_m / 200)",
            "source": "GEBCO gridded bathymetry",
            "interpretation": "Bathymetric proxy, not a measured retrieval depth",
        }

        # --- Vessel suitability formula (static; values are per-candidate) --------
        vessel_suitability = {
            "formula": "0.70 × route_proximity + 0.30 × tonnage_capacity_proxy",
            "routeFormula": "exp(-distance_km / 5)",
            "tonnageFormula": "1 − exp(-tonnage_t / 10)",
        }

        # --- Sensitivity / rank stability -------------------------------------------
        rs = rank_stability.get(job_id)
        sensitivity = None
        if rs and rs["scenarios_scored"] and int(rs["scenarios_scored"]) > 0:
            rank_range = to_float(rs["rank_range"])
            if rank_range is not None and rank_range <= 3:
                band = "ROBUST"
            elif rank_range is not None and rank_range <= 15:
                band = "MODERATE"
            else:
                band = "SENSITIVE"
            t10 = top10_stability.get(job_id)
            sensitivity = {
                "scenariosScored": int(rs["scenarios_scored"]),
                "baselineRank": j["finalRank"],
                "meanRank": to_float(rs["mean_rank"]),
                "medianRank": to_float(rs["median_rank"]),
                "bestRank": to_float(rs["best_rank"]),
                "worstRank": to_float(rs["worst_rank"]),
                "rankRange": rank_range,
                "top10ScenarioCount": int(t10["top10_scenarios"]) if t10 else None,
                "top10PresencePct": to_float(t10["top10_presence_pct"]) if t10 else None,
                "band": band,
            }

        research[job_id] = {
            "gearHazard": gear_hazard,
            "mpaProximity": mpa_proximity,
            "bathymetric": bathymetric,
            "vesselSuitability": vessel_suitability,
            "sensitivity": sensitivity,
        }

    (OUT / "research.json").write_text(json.dumps(research, ensure_ascii=False), encoding="utf-8")
    print(f"research.json: {len(research)} jobs")


# ---------------------------------------------------------------------------
# 6. scenarios.json
# ---------------------------------------------------------------------------
def build_scenarios(jobs_by_id):
    out = {}
    for key, meta in DEMO_SCENARIOS.items():
        job = jobs_by_id.get(meta["job_id"])
        out[key] = {**meta, "job": job}
    (OUT / "scenarios.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("scenarios.json written:", list(out.keys()))


if __name__ == "__main__":
    jobs = build_jobs()
    cands = build_candidates()
    build_kpi(jobs, cands)
    build_vessel_tracks(cands)
    build_mpa()
    build_research(jobs)
    jobs_by_id = {j["jobId"]: j for j in jobs}
    build_scenarios(jobs_by_id)
    print("Done.")
