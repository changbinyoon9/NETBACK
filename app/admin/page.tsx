"use client";

import { useMemo, useState } from "react";
import { useCandidates, useJobs, useKpi, useMpaLayer, useVesselTracks, candidatesForJob } from "@/lib/data";
import { StatCard } from "@/components/StatCard";
import { JobTable } from "@/components/admin/JobTable";
import { JobDrawer } from "@/components/admin/JobDrawer";
import { SimulationHistoryTable } from "@/components/admin/SimulationHistoryTable";
import { MapViewLoader } from "@/components/MapViewLoader";
import type { JobPin } from "@/components/MapView";
import { MpaLayerToggle } from "@/components/MpaLayerToggle";
import { fmtPct } from "@/lib/format";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function AdminOverview() {
  const t = useT();
  const { data: jobs } = useJobs();
  const { data: candidates } = useCandidates();
  const { data: kpi } = useKpi();
  const { data: vesselTracks } = useVesselTracks();
  const { data: mpaLayer } = useMpaLayer();

  const [region, setRegion] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showMpa, setShowMpa] = useState(false);

  const regions = useMemo(() => Array.from(new Set((jobs ?? []).map((j) => j.region))).sort(), [jobs]);

  const filtered = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter((j) => {
      if (region !== "ALL" && j.region !== region) return false;
      if (priority !== "ALL" && j.finalPriorityClass !== priority) return false;
      return true;
    });
  }, [jobs, region, priority]);

  const pins: JobPin[] = filtered
    .filter((j) => j.lat && j.lon)
    .map((j) => ({
      jobId: j.jobId,
      lat: j.lat,
      lon: j.lon,
      finalPriorityClass: j.finalPriorityClass,
      materialRaw: j.materialRaw,
    }));

  const selectedJob = filtered.find((j) => j.jobId === selectedJobId) ?? null;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-navy sm:text-2xl">{t("admin.overview.title")}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t("admin.overview.intro")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label={t("admin.overview.filterRegion")}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">{t("region.all")}</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            aria-label={t("admin.overview.filterPriority")}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">{t("priority.all")}</option>
            <option value="VERY_HIGH">{t("priority.veryHigh")}</option>
            <option value="HIGH">{t("priority.high")}</option>
            <option value="MEDIUM">{t("priority.medium")}</option>
            <option value="LOW">{t("priority.low")}</option>
            <option value="NOT_SCORED">{t("priority.notScored")}</option>
          </select>
        </div>
      </div>

      {kpi && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard value={String(kpi.recoveryJobs)} label={t("admin.stat.records")} />
            <StatCard value={String(kpi.fullyPrioritized)} label={t("admin.stat.fullyPrioritized")} />
            <StatCard value={String(kpi.jobsWithVesselCandidates)} label={t("admin.stat.jobsWithVessel")} />
            <StatCard value={kpi.candidateVesselMatches.toLocaleString()} label={t("admin.stat.candidateMatches")} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard value={fmtPct(kpi.historicalVesselCoveragePct)} label={t("admin.stat.coverage")} accent />
            <StatCard value={String(kpi.avgCandidatesPerJob)} label={t("admin.stat.avgCandidates")} accent />
            <StatCard value={fmtPct(kpi.bestMatchNotNearestPct)} label={t("admin.stat.bestNotNearest")} accent />
            <StatCard value={String(kpi.sensitivityScenariosTested)} label={t("admin.stat.sensitivity")} accent />
          </div>
        </>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="h-[380px] lg:h-[520px]">
          <div className="mb-2 flex justify-end">
            <MpaLayerToggle checked={showMpa} onChange={setShowMpa} />
          </div>
          <MapViewLoader
            center={[36.3, 128.6]}
            zoom={6}
            jobPins={pins}
            onJobClick={setSelectedJobId}
            heightClass="h-[calc(100%-2rem)]"
            mpaLayer={mpaLayer}
            showMpa={showMpa}
          />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <Legend color="#dc2626" label={t("priority.veryHigh")} />
            <Legend color="#ea580c" label={t("priority.high")} />
            <Legend color="#ca8a04" label={t("priority.medium")} />
            <Legend color="#0e63a3" label={t("priority.low")} />
            <Legend color="#94a3b8" label={t("priority.notScored")} />
          </div>
        </div>

        <div className="h-[380px] overflow-y-auto lg:h-[520px]">
          <JobTable jobs={filtered} onSelect={setSelectedJobId} selectedJobId={selectedJobId} />
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-bold text-navy">{t("admin.activity.title")}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t("admin.activity.intro")}</p>
        <div className="mt-3">
          <SimulationHistoryTable />
        </div>
      </div>

      {selectedJob && candidates && vesselTracks && (
        <JobDrawer
          job={selectedJob}
          candidates={candidatesForJob(candidates, selectedJob.jobId)}
          vesselTracks={vesselTracks}
          onClose={() => setSelectedJobId(null)}
        />
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
