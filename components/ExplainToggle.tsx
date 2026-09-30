"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/LocaleProvider";

export function ExplainToggle({
  title,
  reasons,
  footnote,
}: {
  title?: string;
  reasons: string[];
  footnote?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-ocean hover:text-ocean-light"
      >
        <span>{open ? "▾" : "▸"}</span> {title ?? t("common.why")}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-border bg-slate-50 p-3 text-sm">
          <ul className="space-y-1">
            {reasons.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-cyan">+</span>
                <span className="text-ink-soft">{r}</span>
              </li>
            ))}
          </ul>
          {footnote && (
            <p className="mt-2 border-t border-border pt-2 text-xs text-slate-400 italic">
              {footnote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
