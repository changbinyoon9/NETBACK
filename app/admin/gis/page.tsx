"use client";

import { useEffect, useState } from "react";
import { useJobs } from "@/lib/data";
import { StatCard } from "@/components/StatCard";
import { GisHeatmapLoader } from "@/components/admin/GisHeatmapLoader";
import { fmtKRW, fmtPct, fmtScore } from "@/lib/format";
import { useT, useTf } from "@/lib/i18n/LocaleProvider";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ImpactStats = {
  totals: { recoveries: number; successfulWeightKg: number; compensationPaidKrw: number; compensationPendingKrw: number };
  byGear: { gear: string; count: number; weightKg: number }[];
  avgEnvironmentalPriority: number | null;
  pctNearMpa: number | null;
  points: { lat: number; lon: number; gear: string; weightKg: number }[];
};

const GEAR_LABEL_KEY: Record<string, string> = {
  NET: "opsForm.gear.net", TRAP: "opsForm.gear.trap", ROPE: "opsForm.gear.rope", OTHER: "opsForm.gear.other",
};

export default function GisPage() {
  const { data: jobs } = useJobs();
  const t = useT(); const tf = useTf();
  const [impact, setImpact] = useState<ImpactStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/impact-stats", { cache: "no-store" })
      .then((r) => { if(!r.ok) throw new Error("Unable to load statistics"); return r.json(); })
      .then(setImpact)
      .catch(()=>setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const byGearChart = (impact?.byGear ?? []).map((g) => ({ gear: t(GEAR_LABEL_KEY[g.gear] ?? g.gear), weightKg: g.weightKg }));

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
      <h1 className="text-xl font-bold text-navy sm:text-2xl">{t("gis.title")}</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">{t("gis.intro")}</p>

      <Section title={t("gis.section.map")}>
        <p className="mb-3 text-xs text-slate-400">{t("gis.map.note")}</p>
        <div className="h-[480px] overflow-hidden rounded-xl border border-border">
          <GisHeatmapLoader jobs={jobs ?? []} points={impact?.points ?? []} />
        </div>
      </Section>

      <Section title={t("gis.section.impact")}>
        {loading ? (
          <p className="text-sm text-slate-400">{t("gis.impact.loading")}</p>
        ) : failed ? (<p role="alert" className="text-sm text-ink-soft">{t("studio.error.loadFailed")}</p>) : !impact || impact.totals.recoveries === 0 ? (
          <p className="text-sm text-slate-400">{t("gis.impact.empty")}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <StatCard value={String(impact.totals.recoveries)} label={t("gis.impact.recoveries")} />
              <StatCard value={`${impact.totals.successfulWeightKg.toLocaleString()} kg`} label={t("gis.impact.weight")} accent />
              <StatCard value={fmtScore(impact.avgEnvironmentalPriority, 3)} label={t("gis.impact.avgEnvPriority")} />
              <StatCard value={fmtPct(impact.pctNearMpa)} label={t("gis.impact.nearMpa")} />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatCard value={fmtKRW(impact.totals.compensationPaidKrw)} label={t("gis.impact.compensationPaid")} />
              <StatCard value={fmtKRW(impact.totals.compensationPendingKrw)} label={t("gis.impact.compensationPending")} />
            </div>
            {byGearChart.length > 0 && (
              <div className="mt-6 h-64 rounded-xl border border-border bg-white p-4 shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byGearChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5eaf0" vertical={false} />
                    <XAxis dataKey="gear" tick={{ fontSize: 12, fill: "#4a5a72" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#4a5a72" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #dfe6ee", fontSize: 13 }} cursor={{ fill: "#f6f8fa" }} />
                    <Bar name={t("gis.impact.weight")} dataKey="weightKg" radius={[6, 6, 0, 0]} fill="#0e8a7d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-400">{tf("gis.impact.note", { count: impact.totals.recoveries })}</p>
          </>
        )}
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
