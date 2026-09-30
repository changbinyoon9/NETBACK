"use client";

import type { LiveGearClass, Mission } from "@/lib/types";
import { fmtTime } from "@/lib/format";
import { useT, useTf } from "@/lib/i18n/LocaleProvider";

export function StepVerifyCustom({
  gearClass,
  mission,
  onVerify,
}: {
  gearClass: LiveGearClass;
  mission: Mission;
  onVerify: () => void;
}) {
  const t = useT();
  const tf = useTf();
  const GEAR_LABEL: Record<LiveGearClass, string> = {
    FISHING_NET: t("custom.gear.net"),
    FISHING_GEAR: t("custom.gear.gear"),
    GEAR_COMPONENT: t("custom.gear.component"),
    UNKNOWN: t("custom.gear.unknown"),
  };
  const verified = mission.status !== "REPORTED";

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-navy">{t("custom.verify.title")}</h2>
      <p className="mt-1 text-sm text-ink-soft">{tf("custom.verify.queued", { reportId: mission.reportId })}</p>

      <ul className="mt-5 space-y-2 text-sm">
        <Checklist done label={t("verify.locationReceived")} />
        <Checklist done label={tf("custom.verify.observed", { gear: GEAR_LABEL[gearClass] })} />
        <Checklist done={verified} label={t("verify.awaiting")} pending={!verified} />
      </ul>

      {!verified ? (
        <button
          onClick={onVerify}
          className="mt-6 w-full rounded-md bg-ocean px-5 py-3 text-sm font-semibold text-white hover:bg-ocean-light sm:w-auto"
        >
          {t("verify.simulate")}
        </button>
      ) : (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-bold tracking-wide text-emerald-700 uppercase">{t("custom.verify.verified")}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {tf("custom.verify.verifiedBody", { time: fmtTime(mission.timeline.verified) })}
          </p>
        </div>
      )}
    </div>
  );
}

function Checklist({ done, pending, label }: { done: boolean; pending?: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={
          done
            ? "flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white"
            : "flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-300 text-xs"
        }
      >
        {done ? "✓" : ""}
      </span>
      <span className={pending ? "text-slate-400 italic" : "text-ink"}>{label}</span>
    </li>
  );
}
