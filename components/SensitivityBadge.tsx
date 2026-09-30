"use client";

import clsx from "clsx";
import type { SensitivityResearch } from "@/lib/types";
import { useT, useTf } from "@/lib/i18n/LocaleProvider";

const STYLES: Record<string, string> = {
  ROBUST: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MODERATE: "bg-amber-50 text-amber-700 border-amber-200",
  SENSITIVE: "bg-orange-50 text-orange-700 border-orange-200",
};

const LABEL_KEYS: Record<string, string> = {
  ROBUST: "sensitivity.robust",
  MODERATE: "sensitivity.moderate",
  SENSITIVE: "sensitivity.sensitive",
};

export function SensitivityBadge({
  sensitivity,
  detail = true,
}: {
  sensitivity: SensitivityResearch;
  detail?: boolean;
}) {
  const t = useT();
  const tf = useTf();
  return (
    <div>
      <span
        className={clsx(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide whitespace-nowrap",
          STYLES[sensitivity.band]
        )}
      >
        {t(LABEL_KEYS[sensitivity.band])}
      </span>
      {detail && (
        <p className="mt-1.5 text-xs text-ink-soft">
          {tf("sensitivity.detail", {
            baseline: sensitivity.baselineRank ?? "—",
            best: sensitivity.bestRank ?? "—",
            worst: sensitivity.worstRank ?? "—",
            n: sensitivity.scenariosScored,
          })}
          {sensitivity.top10PresencePct !== null &&
            tf("sensitivity.top10", { count: sensitivity.top10ScenarioCount ?? 0, n: sensitivity.scenariosScored })}
        </p>
      )}
    </div>
  );
}
