"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { ProgressSteps } from "@/components/ProgressSteps";
import { useMissionStore } from "@/lib/store";
import type { LiveAnalysisResult, LiveGearClass, Mission, MissionStatus, MissionSubject } from "@/lib/types";
import { StepLocation } from "@/components/simulate/custom/StepLocation";
import { StepVerifyCustom } from "@/components/simulate/custom/StepVerifyCustom";
import { StepPrioritizeCustom } from "@/components/simulate/custom/StepPrioritizeCustom";
import { StepMatchCustom } from "@/components/simulate/custom/StepMatchCustom";
import { StepRecover } from "@/components/simulate/StepRecover";
import { StepComplete } from "@/components/simulate/StepComplete";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";

function statusToStep(status: MissionStatus | undefined): number {
  if (!status) return 2;
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

interface LocationInput {
  lat: number;
  lon: number;
  gearClass: LiveGearClass;
  notes: string;
}

export default function CustomReportPage() {
  const store = useMissionStore();
  const t = useT();
  const { locale } = useLocale();
  const GEAR_LABEL: Record<LiveGearClass, string> = {
    FISHING_NET: t("custom.gear.net"),
    FISHING_GEAR: t("custom.gear.gear"),
    GEAR_COMPONENT: t("custom.gear.component"),
    UNKNOWN: t("custom.gear.unknown"),
  };

  const [location, setLocation] = useState<LocationInput | null>(null);
  const [missionId, setMissionId] = useState<string | null>(null);
  const [liveResult, setLiveResult] = useState<LiveAnalysisResult | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const mission = store.missions.find((m) => m.missionId === missionId);
  const step = location === null ? 1 : statusToStep(mission?.status);

  function handleSubmitLocation(params: LocationInput) {
    setLocation(params);
    const created = store.createMission({
      scenarioKey: "CUSTOM",
      jobId: `CUSTOM-${params.lat.toFixed(3)},${params.lon.toFixed(3)}`,
      candidateVesselCount: 0,
    });
    setMissionId(created.missionId);
  }

  function handleVerify() {
    if (mission) store.advance(mission.missionId, "VERIFIED");
  }

  async function handleRunAnalysis() {
    if (!location) return;
    setLiveLoading(true);
    setLiveError(null);
    try {
      const res = await fetch("/api/analyze-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: location.lat, lon: location.lon, gearClass: location.gearClass, locale }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setLiveError(data.message ?? t("live.engineFailed"));
        setLiveLoading(false);
        return;
      }
      setLiveResult(data as LiveAnalysisResult);
      if (mission) store.setCandidateVesselCount(mission.missionId, data.matching.candidateVesselCount);
    } catch {
      setLiveError(t("live.engineUnreachable"));
    } finally {
      setLiveLoading(false);
    }
  }

  function handleReset() {
    setLocation(null);
    setMissionId(null);
    setLiveResult(null);
    setLiveError(null);
    setLiveLoading(false);
  }

  function handlePrioritizeContinue() {
    if (mission) store.advance(mission.missionId, "PRIORITIZED");
  }

  function handleCreateMission() {
    if (!mission || !liveResult?.matching.bestVessel) return;
    const best = liveResult.matching.bestVessel;
    store.setVessel(mission.missionId, best.vesselId, best.distanceKm);
    store.setFinalPriority(mission.missionId, liveResult.final.finalPriority);
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

  const subject: MissionSubject = {
    jobId: mission?.jobId ?? "CUSTOM",
    materialRaw: location ? GEAR_LABEL[location.gearClass] : t("custom.reportLabel"),
    finalPriority: mission?.finalPriority ?? liveResult?.final.finalPriority ?? null,
  };

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
              <h1 className="mt-1 text-xl font-bold text-navy sm:text-2xl">{t("custom.pageTitle")}</h1>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border bg-white p-4 shadow-sm">
            <ProgressSteps current={step} />
          </div>

          <div className="mt-8">
            {step === 1 && <StepLocation onSubmit={handleSubmitLocation} />}
            {step === 2 && location && mission && (
              <StepVerifyCustom gearClass={location.gearClass} mission={mission} onVerify={handleVerify} />
            )}
            {step === 3 && (
              <StepPrioritizeCustom
                loading={liveLoading}
                error={liveError}
                result={liveResult}
                onRun={handleRunAnalysis}
                onContinue={handlePrioritizeContinue}
                onPickAnotherLocation={handleReset}
              />
            )}
            {step === 4 && liveResult && (
              <StepMatchCustom
                result={liveResult}
                onCreateMission={handleCreateMission}
                missionCreated={mission ? mission.status !== "PRIORITIZED" : false}
              />
            )}
            {step === 5 && mission && (
              <StepRecover
                job={subject}
                mission={mission}
                onAdvance={handleAdvanceRecovery}
                onVerifyRecovery={handleVerifyRecovery}
                onCircularize={handleCircularize}
                onContinue={handleComplete}
              />
            )}
            {step === 6 && mission && <StepComplete job={subject} mission={mission} />}
          </div>
        </div>
      </main>
    </>
  );
}
