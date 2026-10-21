"use client";

import { MapContainer, TileLayer, CircleMarker, Polyline, GeoJSON, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { useEffect } from "react";
import type { Layer, LatLngBoundsExpression, LatLngExpression } from "leaflet";
import type { MpaFeatureCollection } from "@/lib/data";
import type { MpaProperties } from "@/lib/types";
import { useT } from "@/lib/i18n/LocaleProvider";

const PRIORITY_COLOR: Record<string, string> = {
  PLANNED: "#477853",
  VERY_HIGH: "#dc2626",
  HIGH: "#ea580c",
  MEDIUM: "#ca8a04",
  LOW: "#0e63a3",
  NOT_SCORED: "#9ca99f",
};

export interface JobPin {
  jobId: string;
  lat: number;
  lon: number;
  finalPriorityClass: string;
  materialRaw: string;
}

export interface TrackLine {
  vesselId: string;
  points: [number, number][];
  isBest?: boolean;
  suitability?: number;
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 13 });
    }
  }, [bounds, map]);
  return null;
}

// Pans the map when a location arrives from somewhere other than a click on
// the map itself (e.g. the "use my location" button) — a click already shows
// where the user tapped, so this is driven by a separate `flyTo` prop rather
// than `pickedLocation`, to avoid re-centering the view on every manual click.
function FlyTo({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, Math.max(map.getZoom(), 11), { duration: 0.8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.[0], position?.[1]]);
  return null;
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function mpaStyle() {
  return {
    color: "#7c6fa8",
    weight: 1.25,
    opacity: 0.6,
    fillColor: "#8b7fc7",
    fillOpacity: 0.12,
  };
}

function bindMpaTooltip(feature: { properties?: MpaProperties }, layer: Layer) {
  const name = feature.properties?.mpaName ?? "Marine Protected Area";
  layer.bindTooltip(`${name} — Marine Protected Area`, { sticky: true });
}

export function MapView({
  center,
  zoom = 8,
  jobPins = [],
  focusJob,
  tracks = [],
  bestConnection,
  onJobClick,
  bounds,
  heightClass = "h-full",
  mpaLayer,
  showMpa = false,
  onMapClick,
  pickedLocation,
  flyTo,
}: {
  center: LatLngExpression;
  zoom?: number;
  jobPins?: JobPin[];
  focusJob?: JobPin | null;
  tracks?: TrackLine[];
  bestConnection?: [number, number][] | null;
  onJobClick?: (jobId: string) => void;
  bounds?: LatLngBoundsExpression | null;
  heightClass?: string;
  mpaLayer?: MpaFeatureCollection | null;
  showMpa?: boolean;
  onMapClick?: (lat: number, lon: number) => void;
  pickedLocation?: [number, number] | null;
  flyTo?: [number, number] | null;
}) {
  const t = useT();
  return (
    <div className={`w-full ${heightClass} overflow-hidden rounded-xl border border-border`}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        {bounds && <FitBounds bounds={bounds} />}
        {flyTo && <FlyTo position={flyTo} />}
        {onMapClick && <ClickHandler onMapClick={onMapClick} />}

        {showMpa && mpaLayer && (
          <GeoJSON
            key="mpa-layer"
            data={mpaLayer}
            style={mpaStyle}
            onEachFeature={bindMpaTooltip}
          />
        )}

        {tracks.map((t, i) => (
          <Polyline
            key={`${t.vesselId}-${i}`}
            positions={t.points}
            pathOptions={{
              color: t.isBest ? "#0e63a3" : "#3fc1c9",
              weight: t.isBest ? 4 : 1.75,
              opacity: t.isBest ? 0.95 : 0.45,
            }}
          />
        ))}

        {bestConnection && (
          <Polyline
            positions={bestConnection}
            pathOptions={{ color: "#0b1f3a", weight: 2, dashArray: "4 6", opacity: 0.8 }}
          />
        )}

        {focusJob && (
          <CircleMarker
            center={[focusJob.lat, focusJob.lon]}
            radius={9}
            pathOptions={{
              color: "#0b1f3a",
              fillColor: PRIORITY_COLOR[focusJob.finalPriorityClass] ?? "#94a3b8",
              fillOpacity: 1,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              {focusJob.jobId}, {focusJob.materialRaw}
            </Tooltip>
          </CircleMarker>
        )}

        {pickedLocation && (
          <CircleMarker
            center={pickedLocation}
            radius={9}
            pathOptions={{ color: "#0b1f3a", fillColor: "#3fc1c9", fillOpacity: 1, weight: 2 }}
          >
            <Tooltip direction="top" offset={[0, -6]} permanent>
              {t("custom.selectedLocation")}
            </Tooltip>
          </CircleMarker>
        )}

        {jobPins.map((j) => (
          <CircleMarker
            key={j.jobId}
            center={[j.lat, j.lon]}
            radius={6}
            pathOptions={{
              color: "#0b1f3a",
              fillColor: PRIORITY_COLOR[j.finalPriorityClass] ?? "#94a3b8",
              fillOpacity: 0.85,
              weight: 1,
            }}
            eventHandlers={onJobClick ? { click: () => onJobClick(j.jobId) } : undefined}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              {j.jobId}, {j.materialRaw}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
