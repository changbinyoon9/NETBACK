"use client";

import { useMemo, useState } from "react";
import type { Candidate, Job, VesselTracks } from "@/lib/types";
import { PriorityBadge } from "@/components/Badges";
import { fmtKm, fmtScore, fmtTonnage } from "@/lib/format";
import { rankCandidates } from "@/lib/engine";
import { MapViewLoader } from "@/components/MapViewLoader";
import type { TrackLine } from "@/components/MapView";
import { EvidenceBadge } from "@/components/EvidenceBadge";
import { SensitivityBadge } from "@/components/SensitivityBadge";
import { ResearchDetail } from "@/components/ResearchDetail";
import { ResearchModeToggle } from "@/components/ResearchModeToggle";
import { useResearchMode } from "@/lib/researchMode";
import { useResearch } from "@/lib/data";
import { useT, useTf } from "@/lib/i18n/LocaleProvider";

export function JobDrawer({
  job,
  candidates,
  vesselTracks,
  onClose,
}: {
  job: Job;
  candidates: Candidate[];
  vesselTracks: VesselTracks;
  onClose: () => void;
}) {
  const [showMatching, setShowMatching] = useState(false);
  const ranked = useMemo(() => rankCandidates(candidates).slice(0, 8), [candidates]);
  const { enabled: researchMode } = useResearchMode();
  const { data: research } = useResearch();
  const r = research?.[job.jobId];
  const t = useT();
  const tf = useTf();

  const tracks: TrackLine[] = ranked.flatMap((c, i) => {
    const edges = vesselTracks[c.vesselId];
    if (!edges) return [];
    return edges.map((points) => ({ vesselId: c.vesselId, points, isBest: i === 0 }));
  });

  return (
    <div className="fixed inset-0 z-[1300] flex justify-end bg-navy/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-mono text-lg font-bold text-navy">{job.jobId}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label={t("drawer.close")}>
            ✕
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t("drawer.material")}</Label>
              <p className="text-ink">{job.materialRaw}</p>
              <p className="mt-0.5 text-xs text-slate-400">{job.region}, {job.branch}, {job.recoveryDate}</p>
            </div>
            <ResearchModeToggle />
          </div>

          {r && (
            <div className="flex flex-wrap items-center gap-2">
              <EvidenceBadge tier={r.gearHazard.tier} />
              {r.sensitivity && <SensitivityBadge sensitivity={r.sensitivity} detail={false} />}
            </div>
          )}
          {researchMode && r && (
            <ResearchDetail
              rows={[
                { label: t("drawer.gearSource"), value: r.gearHazard.sourceLabel ?? r.gearHazard.assumption ?? "—" },
                { label: t("drawer.mpaSource"), value: r.mpaProximity.source },
                { label: t("drawer.spatialMethod"), value: r.mpaProximity.spatialMethod },
                { label: t("drawer.mpaScore"), value: r.mpaProximity.formula },
                { label: t("drawer.mpaNote"), value: r.mpaProximity.interpretation },
                { label: t("drawer.depthFormula"), value: r.bathymetric.formula },
                { label: t("drawer.suitability"), value: r.vesselSuitability.formula },
                ...(r.sensitivity
                  ? [
                      {
                        label: t("drawer.stability"),
                        value: tf("drawer.stabilityValue", {
                          best: r.sensitivity.bestRank ?? "—",
                          worst: r.sensitivity.worstRank ?? "—",
                          n: r.sensitivity.scenariosScored,
                        }),
                      },
                    ]
                  : []),
              ]}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Stat label={t("drawer.envPriority")} value={fmtScore(job.environmentalPriorityScore)} cls={job.environmentalPriorityClass} />
            <Stat label={t("drawer.bathymetry")} value={`${job.bathymetricDepthM ?? "—"} m`} />
            <Stat label={t("drawer.vesselCandidates")} value={String(job.candidateVesselCount)} />
            <Stat label={t("drawer.finalPriority")} value={fmtScore(job.finalPriority)} cls={job.finalPriorityClass} />
          </div>

          {job.bestVesselId && (
            <div className="rounded-lg border border-border bg-slate-50 p-3">
              <Label>{t("drawer.bestVessel")}</Label>
              <p className="mt-1 font-mono text-sm text-ink">
                {tf("drawer.bestVesselValue", {
                  tonnage: fmtTonnage(job.bestVesselTonnage),
                  distance: fmtKm(job.bestVesselDistanceKm),
                  suit: fmtScore(job.bestVesselSuitability),
                })}
              </p>
            </div>
          )}

          {job.nearestMpaName && (
            <div>
              <Label>{t("drawer.nearestMpa")}</Label>
              <p className="text-sm text-ink">
                {tf("drawer.nearestMpaValue", {
                  name: job.nearestMpaName,
                  type: job.nearestMpaType ?? "",
                  distance: fmtKm(job.mpaDistanceKm),
                })}
              </p>
            </div>
          )}

          {!showMatching ? (
            <button
              onClick={() => setShowMatching(true)}
              className="w-full rounded-md bg-ocean px-4 py-2.5 text-sm font-semibold text-white hover:bg-ocean-light"
            >
              {t("drawer.viewMatching")}
            </button>
          ) : (
            <div>
              <Label>{t("drawer.candidateMatching")}</Label>
              <div className="mt-2 h-56 overflow-hidden rounded-lg border border-border">
                <MapViewLoader
                  center={[job.lat, job.lon]}
                  zoom={11}
                  focusJob={{
                    jobId: job.jobId,
                    lat: job.lat,
                    lon: job.lon,
                    finalPriorityClass: job.finalPriorityClass,
                    materialRaw: job.materialRaw,
                  }}
                  tracks={tracks}
                  heightClass="h-full"
                />
              </div>
              <ul className="mt-3 space-y-1.5 text-xs">
                {ranked.slice(0, 5).map((c, i) => (
                  <li key={c.vesselId} className="flex justify-between rounded bg-slate-50 px-2 py-1.5 font-mono">
                    <span>#{i + 1} {fmtKm(c.distanceKm)}, {fmtTonnage(c.vesselTonnage)}</span>
                    <span className="font-semibold">{fmtScore(c.vesselSuitabilityScore)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{children}</p>;
}

function Stat({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <Label>{label}</Label>
      <p className="mt-1 font-mono text-base font-bold text-navy">{value}</p>
      {cls && (
        <div className="mt-1">
          <PriorityBadge cls={cls} />
        </div>
      )}
    </div>
  );
}
