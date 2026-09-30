"use client";

import type { Job, Mission } from "@/lib/types";
import { fmtTime } from "@/lib/format";
import { useT, useTf } from "@/lib/i18n/LocaleProvider";

export function StepVerify({
  job,
  mission,
  onVerify,
}: {
  job: Job;
  mission: Mission;
  onVerify: () => void;
}) {
  const verified = mission.status !== "REPORTED";
  const t = useT();
  const tf = useTf();

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-navy">{t("verify.title")}</h2>
      <p className="mt-1 break-words text-sm text-ink-soft">{tf("verify.queued", { reportId: mission.reportId })}</p>

      <ul className="mt-5 space-y-2 text-sm">
        <Checklist done label={t("verify.locationReceived")} />
        <Checklist done label={t("verify.recordLoaded")} />
        <Checklist done label={tf("verify.classification", { gearClass: job.gearClass.replace(/_/g, " ") })} />
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
          <p className="text-xs font-bold tracking-wide text-emerald-700 uppercase">{t("verify.verified")}</p>
          <p className="mt-1 break-words text-sm text-ink-soft">
            {tf("verify.createdAt", { jobId: job.jobId, time: fmtTime(mission.timeline.verified) })}
          </p>
        </div>
      )}

      <p className="mt-5 text-xs text-slate-400 italic">{t("verify.disclaimer")}</p>
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
