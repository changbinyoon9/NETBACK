"use client";

import clsx from "clsx";
import type { EvidenceTier } from "@/lib/types";
import { useT } from "@/lib/i18n/LocaleProvider";

const STYLES: Record<EvidenceTier, string> = {
  DIRECT_BROAD_FAMILY: "bg-emerald-50 text-emerald-700 border-emerald-200",
  GENERAL_GEAR_ONLY: "bg-amber-50 text-amber-700 border-amber-200",
  INSUFFICIENT: "bg-slate-100 text-slate-500 border-slate-200",
};

const LABEL_KEYS: Record<EvidenceTier, string> = {
  DIRECT_BROAD_FAMILY: "evidence.direct",
  GENERAL_GEAR_ONLY: "evidence.general",
  INSUFFICIENT: "evidence.insufficient",
};

export function EvidenceBadge({ tier }: { tier: EvidenceTier }) {
  const t = useT();
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide whitespace-nowrap",
        STYLES[tier]
      )}
    >
      {t(LABEL_KEYS[tier])}
    </span>
  );
}
