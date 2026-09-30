"use client";

import { useResearchMode } from "@/lib/researchMode";
import { useT } from "@/lib/i18n/LocaleProvider";

export function ResearchModeToggle() {
  const { enabled, toggle } = useResearchMode();
  const t = useT();

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        enabled
          ? "border-navy bg-navy text-white"
          : "border-border bg-white text-ink-soft hover:border-navy/30"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${enabled ? "bg-cyan" : "bg-slate-300"}`}
      />
      {t("researchMode.label")} {enabled ? t("researchMode.on") : t("researchMode.off")}
    </button>
  );
}
