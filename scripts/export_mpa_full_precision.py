#!/usr/bin/env python3
"""
One-time preprocessing: export the full-precision (unrounded) repaired MPA
polygon set as plain GeoJSON for the TypeScript live engine. This differs
from public/data/marine_protected_areas.geojson, which is coordinate-rounded
for map-display file size — the live engine needs full precision to match
the Python reference engine's distance calculations exactly.

Run once locally whenever the source MPA CSV changes:
    python3 scripts/export_mpa_full_precision.py
"""
import csv
import json
import sys
from pathlib import Path

csv.field_size_limit(sys.maxsize)

sys.path.insert(0, str(Path(__file__).resolve().parent))
from spatial_common import load_mpa_polygons
from shapely.geometry import mapping

ROOT = Path(__file__).resolve().parents[2]
RAW_MPA_FILE = ROOT / "Data" / "해양환경공단_해양보호구역 공간정보_20240910.csv"
OUT = Path(__file__).resolve().parents[1] / "data" / "mpa_polygons.json"


def main():
    polygons = load_mpa_polygons(RAW_MPA_FILE)
    features = []
    for p in polygons:
        features.append({
            "type": "Feature",
            "properties": {
                "mpaId": p["mpaId"],
                "mpaName": p["mpaName"],
                "mpaType": p["mpaType"],
            },
            "geometry": mapping(p["geometry"]),
        })
    geojson = {"type": "FeatureCollection", "features": features}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {len(features)} full-precision MPA polygons to {OUT} ({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
