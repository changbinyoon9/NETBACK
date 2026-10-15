"use client";

import { useMissionStore } from "@/lib/store";
import { StatusBadge } from "@/components/Badges";
import { fmtScore, fmtTime } from "@/lib/format";
import { useT } from "@/lib/i18n/LocaleProvider";

export function SimulationHistoryTable() {
  const missions = useMissionStore((s) => s.missions);
  const t = useT();

  if (missions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-sm text-slate-400">
        {t("simTable.empty")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
      <table className="w-full min-w-[700px] text-sm">
        <thead>
          <tr className="border-b border-border bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <th className="px-4 py-3">{t("simTable.time")}</th>
            <th className="px-4 py-3">{t("simTable.report")}</th>
            <th className="px-4 py-3">{t("simTable.job")}</th>
            <th className="px-4 py-3">{t("simTable.status")}</th>
            <th className="px-4 py-3">{t("simTable.priority")}</th>
            <th className="px-4 py-3">{t("simTable.matchedVessel")}</th>
          </tr>
        </thead>
        <tbody>
          {missions.map((m) => (
            <tr key={m.missionId} className="border-b border-border last:border-none">
              <td className="px-4 py-2.5 font-mono text-ink-soft">{fmtTime(m.timeline.reported)}</td>
              <td className="px-4 py-2.5 font-mono">{m.reportId}</td>
              <td className="px-4 py-2.5 font-mono font-medium text-navy">{m.jobId}</td>
              <td className="px-4 py-2.5">
                <StatusBadge status={m.status} />
                <span className="mt-1 block text-xs text-ink-soft">
                  {m.recoveryResult ?? t("common.pending")}
                  {m.recoveredWeightKg !== undefined ? ` · ${m.recoveredWeightKg} kg (sim.)` : ""}
                </span>
              </td>
              <td className="px-4 py-2.5 font-mono">{fmtScore(m.finalPriority)}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{m.vesselId ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
