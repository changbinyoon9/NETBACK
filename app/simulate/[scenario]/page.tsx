"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { ProgressSteps } from "@/components/ProgressSteps";
import { useCandidates, useScenarios, useVesselTracks, candidatesForJob } from "@/lib/data";
import { useMissionStore } from "@/lib/store";
import type { Candidate, Mission, MissionStatus, ScenarioKey } from "@/lib/types";
import {
  computeDepthRecoverability,
  computeEnvironmentalPriority,
  computeFinalPriority,
} from "@/lib/engine";
import { StepReport } from "@/components/simulate/StepReport";
import { StepVerify } from "@/components/simulate/StepVerify";
import { StepPrioritize } from "@/components/simulate/StepPrioritize";
import { StepMatch } from "@/components/simulate/StepMatch";
import { StepRecover } from "@/components/simulate/StepRecover";
import { StepComplete } from "@/components/simulate/StepComplete";
import { useT } from "@/lib/i18n/LocaleProvider";

const VALID_KEYS: ScenarioKey[] = ["A", "B", "C", "D"];

function statusToStep(status: MissionStatus | undefined): number {
  if (!status) return 1;
  const map: Record<MissionStatus, number> = {
    REPORTED: 2,
    VERIFIED: 3,
    PRIORITIZED: 4,
    MATCHED: 5,
    REQUESTED: 5,
    ACCEPTED: 5,
    IN_PROGRESS: 5,
    RECOVERED: 5,
    VERIFIED_RECOVERY: 5,
    CLOSED: 6,
  };
  return map[status];
}

export default function ScenarioSimulationPage({
  params,
}: PageProps<"/simulate/[scenario]">) {
  const { scenario } = use(params);
  const key = scenario.toUpperCase() as ScenarioKey;
  if (!VALID_KEYS.includes(key)) notFound();

  const { data: scenarios } = useScenarios();
  const { data: allCandidates } = useCandidates();
  const { data: vesselTracks } = useVesselTracks();
  const store = useMissionStore();
  const t = useT();

  const [prioritizeCalculated, setPrioritizeCalculated] = useState(false);
  const [matchSearched, setMatchSearched] = useState(false);
  const [bestCandidate, setBestCandidate] = useState<Candidate | null>(null);
  const [missionId, setMissionId] = useState<string | null>(() => {
    const existing = store.missions.find((m) => m.scenarioKey === key && m.status !== "CLOSED");
    return existing?.missionId ?? null;
  });

  const mission = useMemo(
    () => store.missions.find((m) => m.missionId === missionId),
    [store.missions, missionId]
  );

  if (!scenarios || !allCandidates || !vesselTracks) {
    return (
      <>
        <Nav />
        <main className="flex-1 bg-offwhite p-10 text-center text-sm text-slate-400">Loading…</main>
      </>
    );
  }

  const scenarioMeta = scenarios[key];
  const job = scenarioMeta.job;
  const step = mission?.status === "CLOSED" ? 6 : statusToStep(mission?.status);

  const jobCandidates = candidatesForJob(allCandidates, job.jobId);

  function handleSubmitReport() {
    const created = store.createMission({
      scenarioKey: key,
      jobId: job.jobId,
      candidateVesselCount: job.candidateVesselCount,
    });
    setMissionId(created.missionId);
  }

  function handleVerify() {
    if (mission) store.advance(mission.missionId, "VERIFIED");
  }

  function handlePrioritizeCalculate() {
    setPrioritizeCalculated(true);
  }

  function handlePrioritizeContinue() {
    if (mission) store.advance(mission.missionId, "PRIORITIZED");
  }

  function handleMatchSearched() {
    setMatchSearched(true);
  }

  function handleCreateMission() {
    if (!mission || !bestCandidate) return;
    store.setVessel(mission.missionId, bestCandidate.vesselId, bestCandidate.distanceKm);
    const env = computeEnvironmentalPriority(job);
    const depth = computeDepthRecoverability(job.bathymetricDepthM);
    const finalResult = computeFinalPriority(
      env.environmentalPriority,
      depth,
      bestCandidate.vesselSuitabilityScore
    );
    store.setFinalPriority(mission.missionId, finalResult.finalPriority);
    store.advance(mission.missionId, "MATCHED");
  }

  function handleAdvanceRecovery(status: MissionStatus, extra?: { recoveryResult?: Mission["recoveryResult"]; recoveredWeightKg?: number }) {
    if (!mission) return;
    if (extra?.recoveryResult) store.setRecoveryResult(mission.missionId, extra.recoveryResult);
    if (extra?.recoveredWeightKg !== undefined) store.setRecoveredWeight(mission.missionId, extra.recoveredWeightKg);
    store.advance(mission.missionId, status);
  }

  function handleVerifyRecovery() {
    if (mission) store.advance(mission.missionId, "VERIFIED_RECOVERY");
  }

  function handleCircularize(v: NonNullable<Mission["circularization"]>) {
    if (mission) store.setCircularization(mission.missionId, v);
  }

  function handleComplete() {
    if (mission) store.advance(mission.missionId, "CLOSED");
  }

  return (
    <>
      <Nav />
      <main className="flex-1 bg-offwhite">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link href="/simulate" className="text-xs font-medium text-ocean hover:underline">
                {t("common.backToScenarios")}
              </Link>
              <h1 className="mt-1 text-xl font-bold text-navy sm:text-2xl">
                {t("sim.scenario")} {key}: {t(`sim.tag.${key}`)}
              </h1>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border bg-white p-4 shadow-sm">
            <ProgressSteps current={step} />
          </div>

          <div className="mt-8">
            {step === 1 && <StepReport job={job} mission={mission ?? null} onSubmit={handleSubmitReport} />}
            {step === 2 && mission && <StepVerify job={job} mission={mission} onVerify={handleVerify} />}
            {step === 3 && (
              <StepPrioritize
                job={job}
                calculated={prioritizeCalculated}
                onCalculate={handlePrioritizeCalculate}
                onContinue={handlePrioritizeContinue}
              />
            )}
            {step === 4 && (
              <StepMatch
                job={job}
                candidates={jobCandidates}
                vesselTracks={vesselTracks}
                searched={matchSearched}
                onSearch={handleMatchSearched}
                best={bestCandidate}
                onSelectBest={setBestCandidate}
                onCreateMission={handleCreateMission}
                missionCreated={mission ? mission.status !== "PRIORITIZED" : false}
              />
            )}
            {step === 5 && mission && (
              <StepRecover
                job={job}
                mission={mission}
                onAdvance={handleAdvanceRecovery}
                onVerifyRecovery={handleVerifyRecovery}
                onCircularize={handleCircularize}
                onContinue={handleComplete}
              />
            )}
            {step === 6 && mission && <StepComplete job={job} mission={mission} />}
          </div>
        </div>
      </main>
    </>
  );
}
