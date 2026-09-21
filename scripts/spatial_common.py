"""
Shared spatial-analysis primitives for NETBACK.

This module is the single source of truth for the MPA geometry parser and
the NETBACK Priority Model v1 scoring formulas. Both the offline export
pipeline (export_data.py, historical 178-job dataset) and the live
manual-report analysis engine (analyze_report.py, arbitrary coordinates)
import from here so the two paths cannot silently drift apart.

Formulas are frozen to match Preprocessing.ipynb exactly:
  mpa_proximity_score   = 0.10 + 0.90 * exp(-distance_km / 5), or 1.0 if inside
  depth_recoverability  = exp(-depth_m / 200)
  environmental_priority= 0.60 * gear_hazard_prior + 0.40 * mpa_proximity_score
  route_proximity       = exp(-distance_km / 5)
  tonnage_capacity_proxy= 1 - exp(-tonnage_t / 10)
  vessel_suitability    = 0.70 * route_proximity + 0.30 * tonnage_capacity_proxy
  final_priority        = environmental_priority * depth_recoverability * vessel_suitability
"""
import math
import re

from shapely import wkt
from shapely.geometry import Polygon

# ---------------------------------------------------------------------------
# Gear hazard evidence table (from 04_norway_gear_family_hazard_v2.csv)
# ---------------------------------------------------------------------------
GEAR_CLASSES = {
    "FISHING_NET": {
        "gearHazardPrior": 0.5008,
        "tier": "DIRECT_BROAD_FAMILY",
        "sourceCode": "NORWAY_NET_FAMILY",
        "sourceLabel": "Norwegian ghost-gear catch observations — net-gear family",
        "assumption": "Broad net-family transfer prior",
        "observations": 864,
        "catchPositiveRecords": 326,
    },
    "FISHING_GEAR": {
        "gearHazardPrior": 0.3612,
        "tier": "GENERAL_GEAR_ONLY",
        "sourceCode": "NORWAY_ALL_GEAR_BASELINE",
        "sourceLabel": "Pooled baseline across all Norwegian gear-hazard observations",
        "assumption": "Material did not match a specific gear family — general gear baseline used",
        "observations": None,
        "catchPositiveRecords": None,
    },
    "GEAR_COMPONENT": {
        "gearHazardPrior": None,
        "tier": "INSUFFICIENT",
        "sourceCode": "NO_DEFENSIBLE_GEAR_MATCH",
        "sourceLabel": None,
        "assumption": "No defensible match to catch-observation gear categories for this material",
        "observations": None,
        "catchPositiveRecords": None,
    },
    "UNKNOWN": {
        "gearHazardPrior": None,
        "tier": "INSUFFICIENT",
        "sourceCode": "NO_DEFENSIBLE_GEAR_MATCH",
        "sourceLabel": None,
        "assumption": "No defensible match to catch-observation gear categories for this material",
        "observations": None,
        "catchPositiveRecords": None,
    },
}


def haversine_km(p1, p2) -> float:
    """p1, p2 are (lat, lon) tuples."""
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


def mpa_proximity_score(distance_km: float, inside: bool) -> float:
    if inside:
        return 1.0
    return round(0.10 + 0.90 * math.exp(-distance_km / 5), 4)


def depth_recoverability(depth_m: float) -> float:
    return round(math.exp(-max(depth_m, 0.0) / 200.0), 4)


def environmental_priority(gear_hazard_prior, mpa_score) -> float | None:
    if gear_hazard_prior is None:
        return None
    return round(0.60 * gear_hazard_prior + 0.40 * mpa_score, 4)


def route_proximity_score(distance_km: float) -> float:
    return round(math.exp(-distance_km / 5), 4)


def tonnage_capacity_proxy(tonnage_t: float) -> float:
    return round(1 - math.exp(-tonnage_t / 10), 4)


def vessel_suitability_score(distance_km: float, tonnage_t: float) -> float:
    route = route_proximity_score(distance_km)
    tonnage_proxy = tonnage_capacity_proxy(tonnage_t)
    return round(0.70 * route + 0.30 * tonnage_proxy, 4)


def final_priority(env_priority, depth_recov, vessel_suit) -> float | None:
    if env_priority is None or depth_recov is None or vessel_suit is None:
        return None
    return round(env_priority * depth_recov * vessel_suit, 4)


# ---------------------------------------------------------------------------
# MPA WKT parsing + repair (identical to the research notebook's
# "MPA SPATIAL DATA PREPROCESSING" cell)
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

    if text.startswith("POLYGON ((("):
        repaired = text.replace("POLYGON (((", "POLYGON ((", 1)
        while repaired.endswith(")))"):
            repaired = repaired[:-1]
        try:
            return wkt.loads(repaired), "B"
        except Exception:
            pass

    if text.startswith("POLYGON") and ")),((" in text:
        body = text[len("POLYGON"):].strip()
        repaired = "MULTIPOLYGON (" + body + ")"
        try:
            return wkt.loads(repaired), "C"
        except Exception:
            pass

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


def load_mpa_polygons(raw_mpa_csv_path):
    """Loads and repairs the full-precision MPA polygon/multipolygon set.

    Returns a list of dicts: {mpaId, mpaName, mpaType, geometry (shapely,
    EPSG:4326, unsimplified), geometryRepaired}.
    """
    import csv

    with open(raw_mpa_csv_path, encoding="cp949", newline="") as f:
        rows = list(csv.DictReader(f))

    polygons = []
    for r in rows:
        geom, branch = parse_mpa_geometry(r["GEO_JSON"], r["형태"])
        if geom is None or geom.geom_type == "Point":
            continue
        wkt_repaired = branch != "A"
        valid_repaired = False
        if not geom.is_valid:
            geom = geom.buffer(0)
            valid_repaired = True
        if geom.geom_type not in ("Polygon", "MultiPolygon"):
            continue
        polygons.append({
            "mpaId": r["보호구역 ID"],
            "mpaName": r["보호구역명"],
            "mpaType": r["보호구역 구분"],
            "geometry": geom,
            "geometryRepaired": bool(wkt_repaired or valid_repaired),
        })
    return polygons
