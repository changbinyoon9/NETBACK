"use client";

import { useState } from "react";
import { MapViewLoader } from "@/components/MapViewLoader";
import { useMpaLayer } from "@/lib/data";
import { MpaLayerToggle } from "@/components/MpaLayerToggle";
import type { LiveGearClass } from "@/lib/types";
import { useT } from "@/lib/i18n/LocaleProvider";

export function StepLocation({
  onSubmit,
}: {
  onSubmit: (params: { lat: number; lon: number; gearClass: LiveGearClass; notes: string }) => void;
}) {
  const t = useT();
  const GEAR_OPTIONS: { value: LiveGearClass; label: string; hint: string }[] = [
    { value: "FISHING_NET", label: t("custom.gear.net"), hint: t("custom.gear.netHint") },
    { value: "FISHING_GEAR", label: t("custom.gear.gear"), hint: t("custom.gear.gearHint") },
    { value: "GEAR_COMPONENT", label: t("custom.gear.component"), hint: t("custom.gear.componentHint") },
    { value: "UNKNOWN", label: t("custom.gear.unknown"), hint: t("custom.gear.unknownHint") },
  ];

  const [picked, setPicked] = useState<[number, number] | null>(null);
  const [gearClass, setGearClass] = useState<LiveGearClass>("FISHING_NET");
  const [notes, setNotes] = useState("");
  const [showMpa, setShowMpa] = useState(false);
  const { data: mpaLayer } = useMpaLayer();

  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="text-lg font-semibold text-navy">{t("custom.title")}</h2>
      <p className="mt-1 text-sm text-ink-soft">{t("custom.intro")}</p>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold tracking-wide text-ocean uppercase">{t("custom.reportDetails")}</h3>

          <div className="mt-3">
            <span className="text-xs font-medium text-slate-500">{t("custom.location")}</span>
            {picked ? (
              <p className="mt-1 font-mono text-sm text-ink">
                {picked[0].toFixed(5)}, {picked[1].toFixed(5)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-400 italic">{t("custom.locationHint")}</p>
            )}
          </div>

          <div className="mt-4">
            <span className="text-xs font-medium text-slate-500">{t("custom.gearType")}</span>
            <div className="mt-2 space-y-2">
              {GEAR_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm transition-colors ${
                    gearClass === opt.value ? "border-ocean bg-ocean/5" : "border-border hover:border-ocean/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="gearClass"
                    className="mt-0.5"
                    checked={gearClass === opt.value}
                    onChange={() => setGearClass(opt.value)}
                  />
                  <span>
                    <span className="block font-medium text-ink">{opt.label}</span>
                    <span className="block text-xs text-slate-400">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-medium text-slate-500">{t("custom.notes")}</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
              placeholder={t("custom.notesPlaceholder")}
            />
          </label>

          <button
            disabled={!picked}
            onClick={() => picked && onSubmit({ lat: picked[0], lon: picked[1], gearClass, notes })}
            className="mt-5 w-full rounded-md bg-ocean px-5 py-3 text-sm font-semibold text-white transition-opacity hover:bg-ocean-light disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("custom.submit")}
          </button>
          <p className="mt-3 text-xs text-slate-400 italic">{t("custom.aiFootnote")}</p>
        </div>

        <div className="h-[420px] lg:h-auto">
          <div className="mb-2 flex justify-end">
            <MpaLayerToggle checked={showMpa} onChange={setShowMpa} />
          </div>
          <MapViewLoader
            center={[36.3, 128.6]}
            zoom={7}
            pickedLocation={picked}
            onMapClick={(lat, lon) => setPicked([lat, lon])}
            heightClass="h-[380px] lg:h-[calc(100%-2rem)]"
            mpaLayer={mpaLayer}
            showMpa={showMpa}
          />
        </div>
      </div>
    </div>
  );
}
