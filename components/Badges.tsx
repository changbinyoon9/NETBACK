"use client";

import clsx from "clsx";
import { useT } from "@/lib/i18n/LocaleProvider";

const PRIORITY_STYLES: Record<string, string> = {
  VERY_HIGH: "bg-red-50 text-red-700 border-red-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  LOW: "bg-sky-50 text-sky-700 border-sky-200",
  NOT_SCORED: "bg-slate-100 text-slate-500 border-slate-200",
};

const PRIORITY_KEYS: Record<string, string> = {
  VERY_HIGH: "priority.veryHigh",
  HIGH: "priority.high",
  MEDIUM: "priority.medium",
  LOW: "priority.low",
  NOT_SCORED: "priority.notScored",
};

export function PriorityBadge({ cls }: { cls: string | null | undefined }) {
  const t = useT();
  const key = cls || "NOT_SCORED";
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        PRIORITY_STYLES[key] ?? PRIORITY_STYLES.NOT_SCORED
      )}
    >
      {t(PRIORITY_KEYS[key] ?? "priority.notScored")}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  REPORTED: "bg-slate-100 text-slate-600",
  VERIFIED: "bg-sky-100 text-sky-700",
  PRIORITIZED: "bg-cyan-100 text-cyan-700",
  MATCHED: "bg-indigo-100 text-indigo-700",
  REQUESTED: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  RECOVERED: "bg-emerald-100 text-emerald-700",
  VERIFIED_RECOVERY: "bg-emerald-100 text-emerald-800",
  CLOSED: "bg-navy/10 text-navy",
};

const STATUS_KEYS: Record<string, string> = {
  REPORTED: "status.reported",
  VERIFIED: "status.verified",
  PRIORITIZED: "status.prioritized",
  MATCHED: "status.matched",
  REQUESTED: "status.requested",
  ACCEPTED: "status.accepted",
  IN_PROGRESS: "status.inProgress",
  RECOVERED: "status.recovered",
  VERIFIED_RECOVERY: "status.verifiedRecovery",
  CLOSED: "status.closed",
};

export function StatusBadge({ status }: { status: string }) {
  const t = useT();
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide whitespace-nowrap",
        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"
      )}
    >
      {STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status.replace(/_/g, " ")}
    </span>
  );
}
