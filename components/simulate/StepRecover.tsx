"use client";

import { useState } from "react";
import type { Mission, MissionStatus, MissionSubject } from "@/lib/types";
import { StatusBadge } from "@/components/Badges";
import { fmtKm, fmtTime } from "@/lib/format";
import { useT, useTf } from "@/lib/i18n/LocaleProvider";

export function StepRecover({
  job,
  mission,
  onAdvance,
  onVerifyRecovery,
  onCircularize,
  onContinue,
}: {
  job: MissionSubject;
  mission: Mission;
  onAdvance: (status: MissionStatus, extra?: { recoveryResult?: Mission["recoveryResult"]; recoveredWeightKg?: number }) => void;
  onVerifyRecovery: () => void;
  onCircularize: (v: NonNullable<Mission["circularization"]>) => void;
  onContinue: () => void;
}) {
  const t = useT();
  const tf = useTf();
  const [weight, setWeight] = useState("");
  const [result, setResult] = useState<NonNullable<Mission["recoveryResult"]>>("Recovered");

  const RESULT_LABEL: Record<string, string> = {
    Recovered: t("recover.evidence.recorded"),
    Partial: t("recover.evidence.partial"),
    Failed: t("recover.evidence.failed"),
  };

  const FLOW: { status: MissionStatus; label: string; button: string }[] = [
    { status: "REQUESTED", label: t("recover.flow.requested"), button: t("recover.flow.requestedBtn") },
    { status: "ACCEPTED", label: t("recover.flow.accepted"), button: t("recover.flow.acceptedBtn") },
    { status: "IN_PROGRESS", label: t("recover.flow.inProgress"), button: t("recover.flow.inProgressBtn") },
    { status: "RECOVERED", label: t("recover.flow.recovered"), button: t("recover.flow.recoveredBtn") },
  ];

  const order: MissionStatus[] = [
    "MATCHED",
    "REQUESTED",
    "ACCEPTED",
    "IN_PROGRESS",
    "RECOVERED",
    "VERIFIED_RECOVERY",
  ];
  const currentIdx = order.indexOf(mission.status);

  const outcomeOptions: { value: NonNullable<Mission["circularization"]>; label: string }[] = [
    { value: "Returned to Owner", label: t("recover.gearOutcome.returned") },
    { value: "Reused", label: t("recover.gearOutcome.reused") },
    { value: "Recycled", label: t("recover.gearOutcome.recycled") },
    { value: "Disposed", label: t("recover.gearOutcome.disposed") },
    { value: "Unknown", label: t("recover.gearOutcome.unknown") },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy">{t("recover.title")}</h2>
          <StatusBadge status={mission.status} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <Field label={t("recover.missionId")} value={mission.missionId} />
          <Field label={t("recover.recoveryJob")} value={job.jobId} />
          <Field label={t("recover.matchedVessel")} value={mission.vesselId ?? "—"} />
          <Field label={t("recover.vesselDistance")} value={fmtKm(mission.bestVesselDistanceKm)} />
        </dl>

        <ol className="mt-6 space-y-3">
          {FLOW.map((step, i) => {
            const stepIdx = order.indexOf(step.status);
            const done = currentIdx >= stepIdx;
            const isNext = currentIdx === stepIdx - 1;
            return (
              <li key={step.status} className="flex items-center gap-3">
                <span
                  className={
                    done
                      ? "flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs text-white"
                      : "flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-300 text-xs text-slate-400"
                  }
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className={done ? "text-sm text-ink" : "text-sm text-slate-400"}>{step.label}</span>
                {isNext && step.status !== "RECOVERED" && (
                  <button
                    onClick={() => onAdvance(step.status)}
                    className="ml-auto rounded-md bg-ocean px-3 py-1.5 text-xs font-semibold text-white hover:bg-ocean-light"
                  >
                    {step.button}
                  </button>
                )}
              </li>
            );
          })}
        </ol>

        {currentIdx === order.indexOf("IN_PROGRESS") && (
          <div className="mt-5 rounded-lg border border-border bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-navy">{t("recover.evidence.title")}</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <label className="col-span-2 sm:col-span-1">
                <span className="text-xs text-slate-500">{t("recover.evidence.weight")}</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  disabled={result === "Failed"}
                  value={result === "Failed" ? "0" : weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 42"
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
                />
              </label>
              <label className="col-span-2 sm:col-span-1">
                <span className="text-xs text-slate-500">{t("recover.evidence.result")}</span>
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value as typeof result)}
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
                >
                  <option value="Recovered">{RESULT_LABEL.Recovered}</option>
                  <option value="Partial">{RESULT_LABEL.Partial}</option>
                  <option value="Failed">{RESULT_LABEL.Failed}</option>
                </select>
              </label>
            </div>
            <button
              disabled={result !== "Failed" && (weight.trim() === "" || !Number.isFinite(Number(weight)) || Number(weight) <= 0)}
              onClick={() => onAdvance(result === "Failed" ? "CLOSED" : "RECOVERED", { recoveryResult: result, recoveredWeightKg: result === "Failed" ? 0 : Number(weight) })}
              className="mt-4 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep"
            >
              {result === "Failed" ? t("recover.evidence.closeFailed") : t("recover.evidence.recordButton")}
            </button>
          </div>
        )}

        {mission.status === "RECOVERED" && (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800">
              {tf("recover.result.summary", {
                material: job.materialRaw,
                result: RESULT_LABEL[mission.recoveryResult ?? "Recovered"],
                weight: mission.recoveredWeightKg ?? "—",
              })}
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              {tf("recover.result.recoveredAt", { time: fmtTime(mission.timeline.recovered) })}
            </p>
            <button
              onClick={onVerifyRecovery}
              className="mt-3 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {t("recover.verifyButton")}
            </button>
          </div>
        )}

        {mission.status === "VERIFIED_RECOVERY" && (
          <div className="mt-5 rounded-lg border border-border bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-navy">{t("recover.gearOutcome.title")}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {outcomeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onCircularize(opt.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    mission.circularization === opt.value
                      ? "border-ocean bg-ocean text-white"
                      : "border-border bg-white text-ink-soft hover:border-ocean/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {mission.circularization && (
              <button
                onClick={onContinue}
                className="mt-5 rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-deep"
              >
                {t("recover.completeButton")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium tracking-wide text-slate-400 uppercase">{label}</dt>
      <dd className="break-all font-mono text-ink">{value}</dd>
    </div>
  );
}
