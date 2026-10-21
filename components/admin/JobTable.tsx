"use client";

import { useState } from "react";
import type { Job } from "@/lib/types";
import { PriorityBadge } from "@/components/Badges";
import { fmtKm, fmtScore, fmtTonnage } from "@/lib/format";
import { useT } from "@/lib/i18n/LocaleProvider";
import clsx from "clsx";

type SortKey = "finalPriority" | "candidateVesselCount" | "bestVesselDistanceKm";

export function JobTable({
  jobs,
  onSelect,
  selectedJobId,
}: {
  jobs: Job[];
  onSelect: (jobId: string) => void;
  selectedJobId: string | null;
}) {
  const t = useT();
  const [sortKey, setSortKey] = useState<SortKey>("finalPriority");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(key === "bestVesselDistanceKm" ? 1 : -1);
    }
  }

  const sorted = [...jobs].sort((a, b) => {
    const av = a[sortKey] ?? -1;
    const bv = b[sortKey] ?? -1;
    return (av - bv) * sortDir;
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
      <table className="w-full min-w-[800px] text-sm">
        <thead>
          <tr className="border-b border-border bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <th className="px-4 py-3">{t("job.col.job")}</th>
            <th className="px-4 py-3">{t("job.col.material")}</th>
            <th className="px-4 py-3">{t("job.col.envPriority")}</th>
            <th className="px-4 py-3">{t("job.col.depth")}</th>
            <Th label={t("job.col.candidates")} active={sortKey === "candidateVesselCount"} dir={sortDir} onClick={() => toggleSort("candidateVesselCount")} />
            <Th label={t("job.col.bestVesselDist")} active={sortKey === "bestVesselDistanceKm"} dir={sortDir} onClick={() => toggleSort("bestVesselDistanceKm")} />
            <Th label={t("job.col.finalPriority")} active={sortKey === "finalPriority"} dir={sortDir} onClick={() => toggleSort("finalPriority")} />
            <th className="px-4 py-3">{t("job.col.status")}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((j) => (
            <tr
              key={j.jobId}
              onClick={() => onSelect(j.jobId)}
              className={clsx(
                "cursor-pointer border-b border-border last:border-none hover:bg-slate-50",
                selectedJobId === j.jobId && "bg-ocean/5"
              )}
            >
              <td className="px-4 py-2.5 font-mono font-medium text-navy">{j.jobId}</td>
              <td className="px-4 py-2.5 text-ink-soft">{j.materialRaw}</td>
              <td className="px-4 py-2.5 font-mono">{fmtScore(j.environmentalPriorityScore)}</td>
              <td className="px-4 py-2.5 font-mono">{j.bathymetricDepthM ?? "—"} m</td>
              <td className="px-4 py-2.5 font-mono">{j.candidateVesselCount}</td>
              <td className="px-4 py-2.5 font-mono">
                {j.bestVesselDistanceKm !== null
                  ? `${fmtKm(j.bestVesselDistanceKm)}, ${fmtTonnage(j.bestVesselTonnage)}`
                  : "—"}
              </td>
              <td className="px-4 py-2.5 font-mono font-semibold">{fmtScore(j.finalPriority)}</td>
              <td className="px-4 py-2.5">
                <PriorityBadge cls={j.finalPriorityClass} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: 1 | -1;
  onClick: () => void;
}) {
  return (
    <th className="cursor-pointer px-4 py-3 select-none" onClick={onClick}>
      <span className={clsx("inline-flex items-center gap-1", active && "text-navy")}>
        {label} {active ? (dir === -1 ? "↓" : "↑") : ""}
      </span>
    </th>
  );
}
