#!/usr/bin/env python3
"""
One-time preprocessing: convert the raw vessel-track CSV (WKB hex geometries,
cp949-encoded, ~10k rows) into a compact plain-JSON array the TypeScript live
engine can load directly — no WKB parsing needed at request time, and no
Python runtime needed in production.

Output: web/data/vessel_track_points.json
  [{ vesselId, vesselTonnage, vesselTypeName, fishingVesselFlag, points: [[lat,lon], ...] }, ...]

Run once locally whenever the source CSV changes:
    python3 scripts/export_vessel_points.py
"""
import csv
import json
import sys
from pathlib import Path

csv.field_size_limit(sys.maxsize)

from shapely import wkb

ROOT = Path(__file__).resolve().parents[2]
RAW_VESSEL_TRACKS = ROOT / "Data" / "해양수산부_(융합)어선 항적도_20240221.csv"
OUT = Path(__file__).resolve().parents[1] / "data" / "vessel_track_points.json"


def extract_points(geom):
    """Flattens a LineString/MultiLineString into a list of [lat, lon] vertices."""
    if geom.geom_type == "MultiLineString":
        lines = list(geom.geoms)
    elif geom.geom_type == "LineString":
        lines = [geom]
    else:
        return []
    points = []
    for line in lines:
        for lon, lat in line.coords:
            points.append([round(lat, 6), round(lon, 6)])
    return points


def main():
    rows_out = []
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
            points = extract_points(geom)
            if not points:
                continue
            rows_out.append({
                "vesselId": vessel_id,
                "vesselTonnage": tonnage,
                "vesselTypeName": vessel_type_name,
                "fishingVesselFlag": fishing_flag,
                "points": points,
            })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(rows_out, f, ensure_ascii=False, separators=(",", ":"))

    print(f"Wrote {len(rows_out)} rows to {OUT} ({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
