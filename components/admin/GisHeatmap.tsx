"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Rectangle, CircleMarker, Tooltip } from "react-leaflet";
import type { Job } from "@/lib/types";
import { useT, useTf } from "@/lib/i18n/LocaleProvider";

const CELL_DEG = 0.25;
const RECOVERY_COLOR: Record<string, string> = { NET: "#e86f45", TRAP: "#ca8a04", ROPE: "#0e63a3", OTHER: "#6b7280" };

type ImpactPoint = { lat: number; lon: number; gear: string; weightKg: number };

function buildGrid(jobs: Job[]) {
  const cells = new Map<string, { lat0: number; lon0: number; count: number }>();
  for (const j of jobs) {
    const lat0 = Math.floor(j.lat / CELL_DEG) * CELL_DEG;
    const lon0 = Math.floor(j.lon / CELL_DEG) * CELL_DEG;
    const key = `${lat0.toFixed(2)}:${lon0.toFixed(2)}`;
    const cell = cells.get(key) ?? { lat0, lon0, count: 0 };
    cell.count += 1;
    cells.set(key, cell);
  }
  return Array.from(cells.values());
}

export function GisHeatmap({ jobs, points }: { jobs: Job[]; points: ImpactPoint[] }) {
  const t = useT(); const tf = useTf();
  const cells = useMemo(() => buildGrid(jobs), [jobs]);
  const maxCount = useMemo(() => Math.max(1, ...cells.map((c) => c.count)), [cells]);

  return (
    <div className="relative h-full w-full">
      <MapContainer center={[36, 128.5]} zoom={7} scrollWheelZoom className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        {cells.map((c) => (
          <Rectangle
            key={`${c.lat0}:${c.lon0}`}
            bounds={[[c.lat0, c.lon0], [c.lat0 + CELL_DEG, c.lon0 + CELL_DEG]]}
            pathOptions={{ color: "#0e8a7d", weight: 0.5, fillColor: "#0e8a7d", fillOpacity: 0.12 + (c.count / maxCount) * 0.58 }}
          >
            <Tooltip sticky>{tf("gis.map.cellCount", { count: c.count })}</Tooltip>
          </Rectangle>
        ))}
        {points.map((p, i) => (
          <CircleMarker
            key={i}
            center={[p.lat, p.lon]}
            radius={6}
            pathOptions={{ color: "#0b1f3a", weight: 2, fillColor: RECOVERY_COLOR[p.gear] ?? "#6b7280", fillOpacity: 0.95 }}
          >
            <Tooltip sticky>{tf("gis.map.recoveryTip", { gear: p.gear, weight: p.weightKg })}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] flex flex-col gap-1.5 rounded-lg border border-border bg-white/90 px-3 py-2 text-xs text-ink-soft shadow-sm backdrop-blur">
        <span className="flex items-center gap-2"><i className="block h-3 w-3 rounded-sm" style={{ background: "#0e8a7d", opacity: 0.7 }} />{t("gis.map.legendDensity")}</span>
        <span className="flex items-center gap-2"><i className="block h-2.5 w-2.5 rounded-full border border-navy" style={{ background: "#e86f45" }} />{t("gis.map.legendRecovery")}</span>
      </div>
    </div>
  );
}
