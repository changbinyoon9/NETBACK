"use client";

import { useEffect, useState } from "react";
import type { Job } from "@/lib/types";
import {
  computeDepthRecoverability,
  computeEnvironmentalPriority,
  computePreliminaryPriority,
  priorityClass,
} from "@/lib/engine";
import { fmtScore } from "@/lib/format";
import { EngineTrace, type EngineStep } from "@/components/EngineTrace";
import { EngineStepIcon } from "@/components/EngineStepIcons";
import { ExplainToggle } from "@/components/ExplainToggle";
import { PriorityBadge } from "@/components/Badges";
import { EvidenceBadge } from "@/components/EvidenceBadge";
import { SensitivityBadge } from "@/components/SensitivityBadge";
import { ResearchDetail } from "@/components/ResearchDetail";
import { ResearchModeToggle } from "@/components/ResearchModeToggle";
import { useResearchMode } from "@/lib/researchMode";
import { useResearch } from "@/lib/data";
import { useT, useTf } from "@/lib/i18n/LocaleProvider";

export function StepPrioritize({
  job,
  calculated,
  onCalculate,
  onContinue,
}: {
  job: Job;
  calculated: boolean;
  onCalculate: () => void;
  onContinue: () => void;
}) {
  const env = computeEnvironmentalPriority(job);
  const depthRecoverability = computeDepthRecoverability(job.bathymetricDepthM);
  const prelim = computePreliminaryPriority(env, depthRecoverability);

  const { enabled: researchMode } = useResearchMode();
  const { data: research } = useResearch();
  const r = research?.[job.jobId];
  const t = useT();
  const tf = useTf();
  const [traceRun, setTraceRun] = useState(calculated);
  useEffect(() => {
    setTraceRun(calculated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.jobId]);

  const depthReason =
    (job.bathymetricDepthM ?? 0) < 20
      ? t("prio.depthShallow")
      : (job.bathymetricDepthM ?? 0) < 80
        ? t("prio.depthModerate")
        : t("prio.depthDeep");

  const steps: EngineStep[] = [
    {
      id: "gear",
      icon: <EngineStepIcon kind="gear" />,
      label: t("prio.gearHazardPrior"),
      value: env.scored ? fmtScore(env.gearHazardPrior) : t("prio.notScored"),
      skipped: !env.scored,
      note: env.scored ? undefined : t("prio.notScoredBody"),
    },
    {
      id: "mpa",
      icon: <EngineStepIcon kind="mpa" />,
      label: t("prio.mpaProximityScore"),
      formula: "0.10 + 0.90 × exp(-distance_km / 5)",
      value: env.scored ? fmtScore(env.mpaProximityScore) : "—",
      skipped: !env.scored,
    },
    {
      id: "env",
      icon: <EngineStepIcon kind="env" />,
      label: t("prio.envPriority"),
      formula: "0.6 × gear_hazard + 0.4 × mpa_proximity",
      value: env.scored ? fmtScore(env.environmentalPriority) : t("prio.notScored"),
      skipped: !env.scored,
      emphasis: true,
    },
    {
      id: "depth",
      icon: <EngineStepIcon kind="depth" />,
      label: t("prio.bathyRecoverability"),
      formula: "exp(-depth_m / 200)",
      inputs: [{ label: t("prio.depthProxy"), value: `${job.bathymetricDepthM ?? "—"} m` }],
      value: depthRecoverability !== null ? fmtScore(depthRecoverability) : "—",
      skipped: depthRecoverability === null,
    },
    {
      id: "final",
      icon: <EngineStepIcon kind="final" />,
      label: t("prio.preliminaryPriority"),
      formula: "environmental_priority × depth_recoverability",
      value: prelim.preliminaryPriority !== null ? fmtScore(prelim.preliminaryPriority) : t("prio.notScored"),
      skipped: prelim.preliminaryPriority === null,
      emphasis: true,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-navy">{t("prio.title")}</h2>
          <p className="mt-1 font-mono text-sm text-ink-soft">{job.jobId}</p>
        </div>
        <ResearchModeToggle />
      </div>

      <section className="mt-5 rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold tracking-wide text-ocean uppercase">{t("engine.runEngine")}</h3>
          {r && <EvidenceBadge tier={r.gearHazard.tier} />}
        </div>

        {!traceRun ? (
          <button
            onClick={() => setTraceRun(true)}
            className="mt-4 rounded-md bg-ocean px-5 py-2.5 text-sm font-semibold text-white hover:bg-ocean-light"
          >
            {t("prio.calculate")}
          </button>
        ) : (
          <EngineTrace
            key={job.jobId}
            steps={steps}
            run={traceRun}
            instant={calculated}
            onComplete={onCalculate}
          />
        )}

        {calculated && (
          <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
            <PriorityBadge cls={priorityClass(prelim.preliminaryPriority)} />
            {prelim.reasons.length > 0 && (
              <ExplainToggle title={t("prio.whyScore")} reasons={[...env.reasons, ...prelim.reasons]} />
            )}
          </div>
        )}
        <p className="mt-4 text-xs text-slate-400 italic">{t("prio.disclaimer")}</p>
      </section>

      {calculated && researchMode && r && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold tracking-wide text-ocean uppercase">{t("prio.envEvidence")}</h3>
            {env.scored ? (
              <>
                <ResearchDetail
                  rows={[
                    { label: t("prio.source"), value: r.gearHazard.sourceLabel ?? "—" },
                    { label: t("prio.assumption"), value: r.gearHazard.assumption ?? "—" },
                    ...(r.gearHazard.observations
                      ? [
                          {
                            label: t("prio.evidence"),
                            value: tf("prio.evidenceValue", {
                              obs: r.gearHazard.observations.toLocaleString(),
                              catch: r.gearHazard.catchPositiveRecords?.toLocaleString() ?? "",
                            }),
                          },
                        ]
                      : []),
                  ]}
                />
                <ResearchDetail
                  rows={[
                    { label: t("prio.mpaSource"), value: r.mpaProximity.source },
                    { label: t("prio.spatialMethod"), value: r.mpaProximity.spatialMethod },
                    { label: t("prio.mpaScore"), value: r.mpaProximity.formula },
                    { label: t("prio.interpretation"), value: r.mpaProximity.interpretation },
                  ]}
                />
                <ExplainToggle reasons={env.reasons} footnote={t("prio.envFootnote")} />
              </>
            ) : (
              <>
                <ResearchDetail rows={[{ label: t("prio.reason"), value: r.gearHazard.assumption ?? "—" }]} />
                <ExplainToggle reasons={env.reasons} footnote={t("prio.insufficientFootnote")} />
              </>
            )}
          </section>

          <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold tracking-wide text-ocean uppercase">{t("prio.recoveryContext")}</h3>
            <ResearchDetail
              rows={[
                { label: t("prio.source"), value: r.bathymetric.source },
                { label: t("prio.formula"), value: r.bathymetric.formula },
                { label: t("prio.note"), value: r.bathymetric.interpretation },
              ]}
            />
            <ExplainToggle reasons={[depthReason]} footnote={t("prio.depthFootnote")} />
          </section>
        </div>
      )}

      {calculated && r?.sensitivity && (
        <section className="mt-4 rounded-xl border border-border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold tracking-wide text-ocean uppercase">{t("prio.robustness")}</h3>
          <p className="mt-1 text-xs text-slate-400">{t("prio.robustnessBody")}</p>
          <div className="mt-3">
            <SensitivityBadge sensitivity={r.sensitivity} />
          </div>
        </section>
      )}

      {calculated && (
        <div className="mt-5 flex justify-end">
          <button
            onClick={onContinue}
            className="rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-deep"
          >
            {t("prio.continue")}
          </button>
        </div>
      )}
    </div>
  );
}
