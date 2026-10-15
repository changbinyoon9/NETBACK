"use client";

import type { Job, Mission } from "@/lib/types";
import { fmtTime } from "@/lib/format";
import { useT, useTf } from "@/lib/i18n/LocaleProvider";

export function StepReport({
  job,
  mission,
  onSubmit,
}: {
  job: Job;
  mission: Mission | null;
  onSubmit: () => void;
}) {
  const t = useT();
  const tf = useTf();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-navy">{t("report.title")}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t("report.intro")}</p>

        <dl className="mt-5 space-y-3 text-sm">
          <Field label={t("report.photo")} value={t("report.photoValue")} />
          <Field
            label={t("report.location")}
            value={`${job.lat.toFixed(5)}, ${job.lon.toFixed(5)} · ${job.region}`}
          />
          <Field label={t("report.material")} value={job.materialRaw} />
          <Field
            label={t("report.notes")}
            value={tf("report.notesValue", { vessel: job.recoveryVesselType, branch: job.branch, date: job.recoveryDate })}
          />
        </dl>

        {!mission ? (
          <button
            onClick={onSubmit}
            className="mt-6 w-full rounded-md bg-ocean px-5 py-3 text-sm font-semibold text-white hover:bg-ocean-light sm:w-auto"
          >
            {t("report.submit")}
          </button>
        ) : (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-bold tracking-wide text-emerald-700 uppercase">
              {t("report.statusReported")}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <Field label={t("report.reportId")} value={mission.reportId} mono />
              <Field label={t("report.submitted")} value={fmtTime(mission.timeline.reported)} mono />
            </dl>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-navy">{t("report.usingScenario.title")}</h3>
        <p className="mt-2 text-sm text-ink-soft">
          {tf("report.usingScenario.body", { jobId: job.jobId })}
        </p>
        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">{t("report.futureNote")}</div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</dt>
      <dd className={`mt-0.5 text-ink ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
