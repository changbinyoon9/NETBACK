"use client";

import { useMemo, useState } from "react";
import { useKpi } from "@/lib/data";
import { fmtKRW } from "@/lib/format";
import { useT, useTf } from "@/lib/i18n/LocaleProvider";

export default function BusinessPage() {
  const { data: kpi } = useKpi();
  const t = useT();
  const tf = useTf();

  const [jobs, setJobs] = useState(100);
  const [reviewCost, setReviewCost] = useState(50000);
  const [coordinationCost, setCoordinationCost] = useState(300000);
  const [dispatchCostPerKm, setDispatchCostPerKm] = useState(20000);
  const [manualDeviation, setManualDeviation] = useState(15);
  const [netbackDeviation, setNetbackDeviation] = useState(3);
  const [selectionRate, setSelectionRate] = useState(20); // %

  const prioritySelected = Math.max(1, Math.round((jobs * selectionRate) / 100));

  const manualTotal = useMemo(() => {
    const review = jobs * reviewCost;
    const coordination = jobs * coordinationCost;
    const dispatch = jobs * manualDeviation * dispatchCostPerKm;
    return { review, coordination, dispatch, total: review + coordination + dispatch };
  }, [jobs, reviewCost, coordinationCost, manualDeviation, dispatchCostPerKm]);

  const netbackTotal = useMemo(() => {
    const review = prioritySelected * reviewCost;
    const dispatch = prioritySelected * netbackDeviation * dispatchCostPerKm;
    return { review, dispatch, total: review + dispatch };
  }, [prioritySelected, reviewCost, netbackDeviation, dispatchCostPerKm]);

  const diff = manualTotal.total - netbackTotal.total;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
      <h1 className="text-xl font-bold text-navy sm:text-2xl">{t("biz.title")}</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">{t("biz.intro")}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Inputs */}
        <div className="space-y-5 rounded-xl border border-border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold tracking-wide text-ocean uppercase">{t("biz.assumptions")}</h2>

          <SliderField
            label={t("biz.jobs")}
            value={jobs}
            min={10}
            max={500}
            step={10}
            onChange={setJobs}
            format={(v) => v.toString()}
          />
          <SliderField
            label={t("biz.selectionRate")}
            value={selectionRate}
            min={10}
            max={100}
            step={5}
            onChange={setSelectionRate}
            format={(v) => `${v}% (${prioritySelected})`}
          />
          <SliderField
            label={t("biz.dispatchCost")}
            value={dispatchCostPerKm}
            min={500}
            max={30000}
            step={500}
            onChange={setDispatchCostPerKm}
            format={(v) => fmtKRW(v)}
          />
          <SliderField
            label={t("biz.manualDeviation")}
            value={manualDeviation}
            min={1}
            max={30}
            step={1}
            onChange={setManualDeviation}
            format={(v) => `${v} km`}
          />
          <SliderField
            label={t("biz.netbackDeviation")}
            value={netbackDeviation}
            min={0.5}
            max={15}
            step={0.5}
            onChange={setNetbackDeviation}
            format={(v) => `${v} km`}
          />

          <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
            <NumberField label={t("biz.reviewCost")} value={reviewCost} onChange={setReviewCost} />
            <NumberField label={t("biz.coordinationCost")} value={coordinationCost} onChange={setCoordinationCost} />
          </div>

          {kpi && (
            <button
              onClick={() => setNetbackDeviation(kpi.medianBestVesselDistanceKm)}
              className="text-xs font-medium text-ocean hover:underline"
            >
              {tf("biz.useObserved", { km: kpi.medianBestVesselDistanceKm })}
            </button>
          )}
        </div>

        {/* Comparison */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">{t("biz.manualWorkflow")}</p>
              <p className="mt-2 font-mono text-2xl font-bold text-navy sm:text-3xl">{fmtKRW(manualTotal.total)}</p>
              <ul className="mt-3 space-y-1 text-xs text-ink-soft">
                <li>{t("biz.review")}: {fmtKRW(manualTotal.review)}</li>
                <li>{t("biz.coordination")}: {fmtKRW(manualTotal.coordination)}</li>
                <li>{t("biz.dispatch")}: {fmtKRW(manualTotal.dispatch)}</li>
              </ul>
            </div>
            <div className="rounded-xl border border-ocean/30 bg-ocean/5 p-5 shadow-sm">
              <p className="text-xs font-bold tracking-wide text-ocean uppercase">{t("biz.netbackScenario")}</p>
              <p className="mt-2 font-mono text-2xl font-bold text-navy sm:text-3xl">{fmtKRW(netbackTotal.total)}</p>
              <ul className="mt-3 space-y-1 text-xs text-ink-soft">
                <li>{tf("biz.reviewPriority", { n: prioritySelected })}: {fmtKRW(netbackTotal.review)}</li>
                <li>{t("biz.dispatchMatched")}: {fmtKRW(netbackTotal.dispatch)}</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <p className="text-xs font-bold tracking-wide text-emerald-700 uppercase">{t("biz.illustrativeDiff")}</p>
            <p className="mt-1 font-mono text-3xl font-bold text-emerald-700">{fmtKRW(Math.max(diff, 0))}</p>
            <p className="mt-2 text-xs text-emerald-800">{t("biz.illustrativeNote")}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <BizKpi title={t("biz.kpi.search")} body={t("biz.kpi.searchBody")} />
            <BizKpi title={t("biz.kpi.dispatch")} body={t("biz.kpi.dispatchBody")} />
            <BizKpi title={t("biz.kpi.resource")} body={t("biz.kpi.resourceBody")} />
            <BizKpi title={t("biz.kpi.transparency")} body={t("biz.kpi.transparencyBody")} />
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-navy">{t("biz.model.title")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <ModelCard title={t("biz.model.subscription")} body={t("biz.model.subscriptionBody")} />
          <ModelCard title={t("biz.model.fee")} body={t("biz.model.feeBody")} />
          <ModelCard title={t("biz.model.data")} body={t("biz.model.dataBody")} />
        </div>
      </section>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="font-mono text-sm font-semibold text-navy">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-ocean"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm font-mono"
      />
    </label>
  );
}

function BizKpi({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <p className="text-xs font-bold tracking-wide text-cyan uppercase">{title}</p>
      <p className="mt-1 text-xs text-ink-soft">{body}</p>
    </div>
  );
}

function ModelCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <p className="font-semibold text-navy">{title}</p>
      <p className="mt-1 text-sm text-ink-soft">{body}</p>
    </div>
  );
}
