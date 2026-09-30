"use client";

import clsx from "clsx";
import { useT } from "@/lib/i18n/LocaleProvider";

const STEP_KEYS = ["step.report", "step.verify", "step.prioritize", "step.match", "step.recover", "step.complete"];

export function ProgressSteps({ current }: { current: number }) {
  const t = useT();
  return (
    <div className="w-full overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 sm:gap-2">
        {STEP_KEYS.map((key, i) => {
          const step = i + 1;
          const label = t(key);
          const state = step < current ? "done" : step === current ? "active" : "pending";
          return (
            <li key={key} className="flex items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    state === "done" && "bg-ocean text-white",
                    state === "active" && "bg-cyan text-navy-deep ring-4 ring-cyan/20",
                    state === "pending" && "bg-slate-200 text-slate-500"
                  )}
                >
                  {state === "done" ? "✓" : step}
                </span>
                <span
                  className={clsx(
                    "text-xs font-medium sm:text-sm",
                    state === "pending" ? "text-slate-400" : "text-ink"
                  )}
                >
                  {label}
                </span>
              </div>
              {step < STEP_KEYS.length && <span className="h-px w-4 bg-slate-300 sm:w-8" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
