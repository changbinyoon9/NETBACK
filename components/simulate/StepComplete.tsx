"use client";

import Link from "next/link";
import type { Mission, MissionSubject } from "@/lib/types";
import { fmtKm, fmtScore, fmtTime } from "@/lib/format";
import { useT, useTf } from "@/lib/i18n/LocaleProvider";

export function StepComplete({ job, mission }: { job: MissionSubject; mission: Mission }) {
  const t = useT();
  const tf = useTf();

  const TIMELINE_ROWS: { key: keyof Mission["timeline"]; label: string }[] = [
    { key: "reported", label: t("complete.timeline.reported") },
    { key: "verified", label: t("complete.timeline.verified") },
    { key: "prioritized", label: t("complete.timeline.prioritized") },
    { key: "matched", label: t("complete.timeline.matched") },
    { key: "recovered", label: t("complete.timeline.recovered") },
    { key: "verifiedRecovery", label: t("complete.timeline.verifiedRecovery") },
  ];

  const RESULT_LABEL: Record<string, string> = {
    Recovered: t("recover.evidence.recorded"),
    Partial: t("recover.evidence.partial"),
    Failed: t("recover.evidence.failed"),
  };

  const OUTCOME_LABEL: Record<string, string> = {
    "Returned to Owner": t("recover.gearOutcome.returned"),
    Reused: t("recover.gearOutcome.reused"),
    Recycled: t("recover.gearOutcome.recycled"),
    Disposed: t("recover.gearOutcome.disposed"),
    Unknown: t("recover.gearOutcome.unknown"),
  };

  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
        {mission.recoveryResult === "Failed" ? "—" : "✓"}
      </div>
      <h2 className="mt-4 text-2xl font-bold text-navy">
        {mission.recoveryResult === "Failed" ? t("complete.failedTitle") : t("complete.title")}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {mission.missionId}, {job.jobId}, {job.materialRaw}
      </p>

      <p className="mt-3 text-sm text-ink-soft">
        {tf("complete.simResult", {
          result: mission.recoveryResult ? RESULT_LABEL[mission.recoveryResult] : t("complete.notRecorded"),
          weight: mission.recoveredWeightKg ?? "—",
        })}
      </p>
      <div className="mt-6 rounded-xl border border-border bg-white p-6 text-left shadow-sm">
        <h3 className="text-sm font-bold tracking-wide text-ocean uppercase">{t("complete.timeline")}</h3>
        <ol className="mt-3 space-y-1.5 text-sm">
          {TIMELINE_ROWS.map((row) => (
            <li key={row.key} className="flex justify-between border-b border-dashed border-border py-1 last:border-none">
              <span className="text-ink-soft">{row.label}</span>
              <span className="font-mono text-ink">{fmtTime(mission.timeline[row.key])}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <MiniCard label={t("complete.finalPriority")} value={fmtScore(mission.finalPriority ?? job.finalPriority)} />
        <MiniCard label={t("complete.candidateVessels")} value={String(mission.candidateVesselCount)} />
        <MiniCard label={t("complete.bestMatch")} value={fmtKm(mission.bestVesselDistanceKm)} />
      </div>

      {mission.circularization && (
        <p className="mt-4 text-sm text-ink-soft">
          {t("complete.gearOutcome")} <span className="font-semibold text-navy">{OUTCOME_LABEL[mission.circularization]}</span>
        </p>
      )}

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/simulate"
          className="rounded-md border border-border px-5 py-3 text-sm font-semibold text-navy hover:bg-slate-50"
        >
          {t("complete.runAnother")}
        </Link>
        <Link
          href="/admin"
          className="rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-deep"
        >
          {t("complete.viewAdmin")}
        </Link>
      </div>
    </div>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="font-mono text-lg font-bold text-navy">{value}</div>
      <div className="mt-0.5 text-xs text-slate-400">{label}</div>
    </div>
  );
}
