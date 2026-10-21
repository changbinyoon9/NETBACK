"use client";

import { useEffect, useMemo, useState } from "react";
import type { Candidate, Job, VesselTracks } from "@/lib/types";
import { rankCandidates } from "@/lib/engine";
import { fmtKm, fmtScore, fmtTonnage } from "@/lib/format";
import { MapViewLoader } from "@/components/MapViewLoader";
import type { TrackLine } from "@/components/MapView";
import { MpaLayerToggle } from "@/components/MpaLayerToggle";
import { useKpi, useMpaLayer } from "@/lib/data";
import { useT, useTf } from "@/lib/i18n/LocaleProvider";
import clsx from "clsx";

export function StepMatch({
  job,
  candidates,
  vesselTracks,
  searched,
  onSearch,
  best,
  onSelectBest,
  onCreateMission,
  missionCreated,
}: {
  job: Job;
  candidates: Candidate[];
  vesselTracks: VesselTracks;
  searched: boolean;
  onSearch: () => void;
  best: Candidate | null;
  onSelectBest: (c: Candidate) => void;
  onCreateMission: () => void;
  missionCreated: boolean;
}) {
  const t = useT();
  const tf = useTf();
  const SEARCH_LINES = [t("match.searching1"), t("match.searching2"), t("match.searching3"), t("match.searching4")];

  const [searching, setSearching] = useState(false);
  const [lineCount, setLineCount] = useState(0);
  const [showMpa, setShowMpa] = useState(false);
  const { data: mpaLayer } = useMpaLayer();
  const { data: kpi } = useKpi();

  const ranked = useMemo(() => rankCandidates(candidates), [candidates]);

  useEffect(() => {
    if (!searching) return;
    if (lineCount >= SEARCH_LINES.length) {
      const t = setTimeout(() => {
        setSearching(false);
        onSearch();
        if (ranked[0]) onSelectBest(ranked[0]);
      }, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLineCount((c) => c + 1), 380);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching, lineCount]);

  function startSearch() {
    setLineCount(0);
    setSearching(true);
  }

  if (candidates.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="font-bold text-amber-800">{t("match.noneFoundTitle")}</p>
        <p className="mt-2 text-sm text-amber-700">{t("match.noneFoundBody")}</p>
      </div>
    );
  }

  const top5 = ranked.slice(0, 5);
  const tracks: TrackLine[] = top5.flatMap((c) => {
    const edges = vesselTracks[c.vesselId];
    if (!edges) return [];
    const isBest = best?.vesselId === c.vesselId;
    return edges.map((points) => ({ vesselId: c.vesselId, points, isBest }));
  });

  const allPoints: [number, number][] = [
    [job.lat, job.lon],
    ...tracks.flatMap((t) => t.points),
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="text-lg font-semibold text-navy">{t("match.title")}</h2>
      <p className="mt-1 text-sm text-ink-soft">{tf("match.intro", { jobId: job.jobId })}</p>

      {!searched && !searching && (
        <button
          onClick={startSearch}
          className="mt-5 rounded-md bg-ocean px-5 py-3 text-sm font-semibold text-white hover:bg-ocean-light"
        >
          {t("match.searchButton")}
        </button>
      )}

      {searching && (
        <div className="mt-5 rounded-xl border border-border bg-white p-5 font-mono text-sm shadow-sm">
          {SEARCH_LINES.slice(0, lineCount).map((l, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5 text-ink-soft">
              <span className="text-emerald-500">✓</span> {l}
            </div>
          ))}
        </div>
      )}

      {searched && (
        <>
          <div className="mt-5 rounded-xl border border-border bg-white p-4 text-sm shadow-sm">
            <span className="font-mono font-bold text-navy">{candidates.length}</span> {t("match.foundSummary")}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              {top5.map((c, i) => (
                <CandidateCard
                  key={c.vesselId}
                  candidate={c}
                  rank={i + 1}
                  isBest={best?.vesselId === c.vesselId}
                  onSelect={() => onSelectBest(c)}
                />
              ))}
            </div>

            <div className="h-[360px] lg:h-auto">
              <div className="mb-2 flex justify-end">
                <MpaLayerToggle checked={showMpa} onChange={setShowMpa} />
              </div>
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
                bounds={allPoints.length > 1 ? allPoints : null}
                heightClass="h-[320px] lg:h-[calc(100%-2rem)]"
                mpaLayer={mpaLayer}
                showMpa={showMpa}
              />
              <p className="mt-2 text-xs text-slate-400">
                {tf("match.tracksShown", { n: tracks.length, total: candidates.length })}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
            <p className="font-semibold text-slate-600">{t("match.suitabilityFormula")}</p>
            <p className="mt-1">{t("match.availabilityFootnote")}</p>
            {kpi && <p className="mt-1">{tf("match.notNearestNote", { pct: kpi.bestMatchNotNearestPct.toFixed(1) })}</p>}
          </div>

          {best && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-bold tracking-wide text-emerald-600 uppercase">{t("match.bestMatch")}</p>
                <p className="mt-1 font-mono text-sm text-ink-soft">
                  {best.vesselId}, {fmtKm(best.distanceKm)} {t("match.away")}, {fmtTonnage(best.vesselTonnage)}
                </p>
              </div>
              {!missionCreated ? (
                <button
                  onClick={onCreateMission}
                  className="rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-deep"
                >
                  {t("match.createMission")}
                </button>
              ) : (
                <span className="rounded-md bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                  {t("match.missionCreated")}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CandidateCard({
  candidate,
  rank,
  isBest,
  onSelect,
}: {
  candidate: Candidate;
  rank: number;
  isBest: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  const tf = useTf();
  return (
    <button
      onClick={onSelect}
      className={clsx(
        "w-full rounded-xl border bg-white p-4 text-left shadow-sm transition-colors",
        isBest ? "border-ocean ring-2 ring-ocean/30" : "border-border hover:border-ocean/40"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">{tf("match.candidate", { rank })}</span>
        {isBest && (
          <span className="rounded-full bg-ocean px-2.5 py-0.5 text-xs font-bold text-white">
            {t("match.bestMatch").toUpperCase()}
          </span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <MiniStat label={t("match.trackDistance")} value={fmtKm(candidate.distanceKm)} />
        <MiniStat label={t("match.tonnage")} value={fmtTonnage(candidate.vesselTonnage)} />
        <MiniStat label={t("match.routeProximity")} value={fmtScore(candidate.routeProximityScore)} />
        <MiniStat label={t("match.suitability")} value={fmtScore(candidate.vesselSuitabilityScore)} />
      </div>
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">{label}</div>
      <div className="font-mono font-semibold text-ink">{value}</div>
    </div>
  );
}
