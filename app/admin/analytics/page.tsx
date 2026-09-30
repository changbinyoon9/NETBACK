"use client";

import { useKpi } from "@/lib/data";
import { StatCard } from "@/components/StatCard";
import { fmtPct } from "@/lib/format";
import { useT, useTf } from "@/lib/i18n/LocaleProvider";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const CLASS_ORDER = ["VERY_HIGH", "HIGH", "MEDIUM", "LOW", "NOT_SCORED"];
const CLASS_LABEL_KEY: Record<string, string> = {
  VERY_HIGH: "priority.veryHigh",
  HIGH: "priority.high",
  MEDIUM: "priority.medium",
  LOW: "priority.low",
  NOT_SCORED: "priority.notScored",
};
const CLASS_COLOR: Record<string, string> = {
  VERY_HIGH: "#dc2626",
  HIGH: "#ea580c",
  MEDIUM: "#ca8a04",
  LOW: "#0e63a3",
  NOT_SCORED: "#94a3b8",
};

export default function AnalyticsPage() {
  const { data: kpi } = useKpi();
  const t = useT();
  const tf = useTf();

  if (!kpi) {
    return <div className="p-10 text-center text-sm text-slate-400">{t("analytics.loading")}</div>;
  }

  const dist = CLASS_ORDER.map((k) => ({
    key: k,
    label: t(CLASS_LABEL_KEY[k]),
    count: kpi.finalPriorityDistribution[k] ?? 0,
  }));

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
      <h1 className="text-xl font-bold text-navy sm:text-2xl">{t("analytics.title")}</h1>
      <p className="mt-1 text-sm text-ink-soft">{t("analytics.intro")}</p>

      <Section title={t("analytics.section.coverage")}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard value={String(kpi.recoveryJobs)} label={t("analytics.recoveryJobs")} />
          <StatCard value={String(kpi.jobsWithVesselCandidates)} label={t("analytics.jobsWithCandidate")} />
          <StatCard value={fmtPct(kpi.historicalVesselCoveragePct)} label={t("analytics.trackCoverage")} accent />
        </div>
      </Section>

      <Section title={t("analytics.section.distribution")}>
        <div className="h-72 rounded-xl border border-border bg-white p-4 shadow-sm">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dist} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#4a5a72" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#4a5a72" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #dfe6ee", fontSize: 13 }}
                cursor={{ fill: "#f6f8fa" }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {dist.map((d) => (
                  <Cell key={d.key} fill={CLASS_COLOR[d.key]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title={t("analytics.section.network")}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard value={kpi.uniqueCandidateVessels.toLocaleString()} label={t("analytics.uniqueVessels")} />
          <StatCard value={String(kpi.medianCandidatesPerJob)} label={t("analytics.medianCandidates")} />
          <StatCard value={String(kpi.avgCandidatesPerJob)} label={t("analytics.meanCandidates")} />
        </div>
      </Section>

      <Section title={t("analytics.section.robustness")}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <StatCard value={String(kpi.sensitivityScenariosTested)} label={t("analytics.scenariosTested")} />
          <StatCard value={kpi.medianSpearman.toFixed(4)} label={t("analytics.medianSpearman")} />
          <StatCard value={kpi.minSpearman.toFixed(4)} label={t("analytics.minSpearman")} />
          <StatCard
            value={`${kpi.topJobStableScenarios} / ${kpi.sensitivityScenariosTested}`}
            label={t("analytics.topJobStable")}
          />
        </div>
        <p className="mt-3 text-xs text-slate-400">
          {tf("analytics.robustnessNote", { job: kpi.highestFinalPriorityJob })}
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold tracking-wide text-ocean uppercase">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
