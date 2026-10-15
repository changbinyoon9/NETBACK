"use client";

import { useEffect, useState } from "react";
import type { LiveAnalysisResult } from "@/lib/types";
import { fmtScore } from "@/lib/format";
import { EngineTrace, type EngineStep } from "@/components/EngineTrace";
import { ExplainToggle } from "@/components/ExplainToggle";
import { PriorityBadge } from "@/components/Badges";
import { EvidenceBadge } from "@/components/EvidenceBadge";
import { ResearchDetail } from "@/components/ResearchDetail";
import { ResearchModeToggle } from "@/components/ResearchModeToggle";
import { useResearchMode } from "@/lib/researchMode";
import { useT, useTf } from "@/lib/i18n/LocaleProvider";

function priorityClassOf(score: number | null): string {
  if (score === null) return "NOT_SCORED";
  if (score >= 0.55) return "VERY_HIGH";
  if (score >= 0.4) return "HIGH";
  if (score >= 0.25) return "MEDIUM";
  return "LOW";
}

export function StepPrioritizeCustom({
  loading,
  error,
  result,
  onRun,
  onContinue,
  onPickAnotherLocation,
}: {
  loading: boolean;
  error: string | null;
  result: LiveAnalysisResult | null;
  onRun: () => void;
  onContinue: () => void;
  onPickAnotherLocation: () => void;
}) {
  const { enabled: researchMode } = useResearchMode();
  const t = useT();
  const tf = useTf();
  const [traceDone, setTraceDone] = useState(false);

  useEffect(() => {
    setTraceDone(false);
  }, [result]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="font-bold text-amber-800">{t("prioCustom.errorTitle")}</p>
        <p className="mt-2 text-sm text-amber-700">{error}</p>
        <button
          onClick={onPickAnotherLocation}
          className="mt-4 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          {t("prioCustom.pickAnother")}
        </button>
      </div>
    );
  }

  if (!result && !loading) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-lg font-semibold text-navy">{t("prioCustom.runTitle")}</h2>
        <p className="mt-2 text-sm text-ink-soft">{t("prioCustom.runIntro")}</p>
        <button
          onClick={onRun}
          className="mt-5 rounded-md bg-ocean px-5 py-3 text-sm font-semibold text-white hover:bg-ocean-light"
        >
          {t("prioCustom.runTitle")}
        </button>
      </div>
    );
  }

  if (loading || !result) {
    return (
      <div role="status" className="mx-auto max-w-md rounded-xl border border-border bg-white p-6 text-sm text-ink-soft">
        <span className="mr-3 inline-block h-3 w-3 animate-spin rounded-full border-2 border-ocean border-t-transparent" />
        {t("prioCustom.loading")}
      </div>
    );
  }

  const env = result.environmental;
  const scored = env.gearHazardPrior !== null;
  const preliminaryPriority = scored
    ? Math.round((env.environmentalPriority ?? 0) * result.bathymetry.depthRecoverability * 10000) / 10000
    : null;
  const priorityClass = priorityClassOf(preliminaryPriority);
  const why = result.explain.why;

  const steps: EngineStep[] = [
    {
      id: "gear",
      icon: "◈",
      label: t("prio.gearHazardPrior"),
      value: scored ? fmtScore(env.gearHazardPrior) : t("prio.notScored"),
      skipped: !scored,
      note: scored ? why[0] : (env.gearAssumption ?? undefined),
    },
    {
      id: "mpa",
      icon: "▲",
      label: t("prio.mpaProximityScore"),
      formula: "0.10 + 0.90 × exp(-distance_km / 5)",
      value: scored ? fmtScore(env.mpaProximityScore) : "—",
      skipped: !scored,
      note: why[1],
    },
    {
      id: "env",
      icon: "∑",
      label: t("prio.envPriority"),
      formula: "0.6 × gear_hazard + 0.4 × mpa_proximity",
      value: scored ? fmtScore(env.environmentalPriority) : t("prio.notScored"),
      skipped: !scored,
      emphasis: true,
    },
    {
      id: "depth",
      icon: "≈",
      label: t("prio.bathyRecoverability"),
      formula: "exp(-depth_m / 200)",
      inputs: [{ label: t("prio.depthProxy"), value: `${result.bathymetry.depthM} m` }],
      value: fmtScore(result.bathymetry.depthRecoverability),
      note: why[2],
    },
    {
      id: "final",
      icon: "★",
      label: t("prio.preliminaryPriority"),
      formula: "environmental_priority × depth_recoverability",
      value: preliminaryPriority !== null ? fmtScore(preliminaryPriority) : t("prio.notScored"),
      skipped: preliminaryPriority === null,
      emphasis: true,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-navy">{t("prio.title")}</h2>
          <p className="mt-1 font-mono text-sm text-ink-soft">
            {result.report.lat.toFixed(5)}, {result.report.lon.toFixed(5)}
          </p>
        </div>
        <ResearchModeToggle />
      </div>

      <section className="mt-5 rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold tracking-wide text-ocean uppercase">{t("engine.runEngine")}</h3>
          <EvidenceBadge tier={env.gearEvidenceTier} />
        </div>
        <EngineTrace
          key={`${result.report.lat}-${result.report.lon}`}
          steps={steps}
          run={true}
          onComplete={() => setTraceDone(true)}
        />

        {traceDone && (
          <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
            <PriorityBadge cls={priorityClass} />
            <ExplainToggle title={t("prio.whyScore")} reasons={why} footnote={result.explain.limitations.join(" ")} />
          </div>
        )}
        <p className="mt-4 text-xs text-slate-400 italic">{t("prioCustom.disclaimer")}</p>
      </section>

      {traceDone && researchMode && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold tracking-wide text-ocean uppercase">{t("prio.envEvidence")}</h3>
            {scored ? (
              <>
                <ResearchDetail
                  rows={[
                    { label: t("prio.source"), value: env.gearSourceLabel ?? "—" },
                    { label: t("prio.assumption"), value: env.gearAssumption ?? "—" },
                    ...(env.observations
                      ? [{ label: t("prio.evidence"), value: tf("prio.evidenceValue", { obs: env.observations.toLocaleString(), catch: env.catchPositiveRecords?.toLocaleString() ?? "" }) }]
                      : []),
                  ]}
                />
                <ResearchDetail
                  rows={[
                    { label: t("prio.mpaSource"), value: "Korean Marine Protected Area spatial data (2024)" },
                    { label: t("prio.spatialMethod"), value: "Live minimum distance to nearest polygon boundary" },
                    { label: t("prio.nearestMpa"), value: `${env.nearestMpaName} — ${env.mpaDistanceKm.toFixed(2)} km` },
                    { label: t("prio.mpaScore"), value: "0.10 + 0.90 × exp(-distance_km / 5)" },
                  ]}
                />
              </>
            ) : (
              <ResearchDetail rows={[{ label: t("prio.reason"), value: env.gearAssumption ?? "—" }]} />
            )}
          </section>

          <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold tracking-wide text-ocean uppercase">{t("prio.recoveryContext")}</h3>
            <ResearchDetail
              rows={[
                { label: t("prio.source"), value: "GEBCO gridded bathymetry (live raster sample)" },
                { label: t("prio.formula"), value: "exp(-depth_m / 200)" },
                { label: t("prio.note"), value: "Bathymetric proxy, not a measured retrieval depth" },
              ]}
            />
          </section>
        </div>
      )}

      {traceDone && (
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          {t("prioCustom.sensitivityNote")}
        </div>
      )}

      {traceDone && (
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
