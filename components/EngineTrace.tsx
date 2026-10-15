"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/LocaleProvider";

export interface EngineStepInput {
  label: string;
  value: string;
}

export interface EngineStep {
  id: string;
  icon: string;
  label: string;
  formula?: string;
  inputs?: EngineStepInput[];
  value: string;
  skipped?: boolean;
  note?: string;
  emphasis?: boolean;
}

// Reveals a sequence of already-computed engine steps one at a time, with a
// brief "computing" state per step, so a synchronous calculation reads as a
// running pipeline instead of a static number dump. Nothing here invents a
// number: every value comes from the caller's already-computed result.
export function EngineTrace({
  steps,
  run,
  instant = false,
  onComplete,
  stepDelay = 560,
}: {
  steps: EngineStep[];
  run: boolean;
  instant?: boolean;
  onComplete?: () => void;
  stepDelay?: number;
}) {
  const t = useT();
  const [revealed, setRevealed] = useState(instant ? steps.length : 0);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    if (!run) {
      setRevealed(instant ? steps.length : 0);
      setComputing(false);
      return;
    }
    if (instant) {
      setRevealed(steps.length);
      return;
    }
    if (revealed >= steps.length) {
      const done = setTimeout(() => onComplete?.(), 260);
      return () => clearTimeout(done);
    }
    setComputing(true);
    const reveal = setTimeout(() => {
      setComputing(false);
      setRevealed((r) => r + 1);
    }, stepDelay);
    return () => clearTimeout(reveal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, revealed, steps.length, instant]);

  if (!run) return null;

  const shown = steps.slice(0, revealed + (computing ? 1 : 0));

  return (
    <div className={`engine-trace ${instant ? "is-instant" : ""}`} role="status" aria-live="polite">
      {shown.map((step, i) => {
        const active = computing && i === revealed;
        return (
          <div key={step.id} className={`engine-step ${active ? "is-computing" : "is-done"}`}>
            <div className="engine-step-node" aria-hidden="true">
              <span>{step.icon}</span>
            </div>
            <div className="engine-step-body">
              <div className="engine-step-head">
                <span className="engine-step-label">{step.label}</span>
                {!active && (
                  <span className={`engine-step-value ${step.emphasis ? "is-emphasis" : ""}`}>{step.value}</span>
                )}
              </div>
              {step.formula && <code className="engine-step-formula">{step.formula}</code>}
              {!active && step.inputs && step.inputs.length > 0 && (
                <div className="engine-step-inputs">
                  {step.inputs.map((inp) => (
                    <span key={inp.label}>
                      <b>{inp.label}</b> {inp.value}
                    </span>
                  ))}
                </div>
              )}
              {active && <span className="engine-step-computing">{t("engine.computing")}</span>}
              {!active && step.note && (
                <p className={step.skipped ? "engine-step-skip" : "engine-step-note"}>{step.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
