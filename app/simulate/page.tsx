"use client";

import Link from "next/link";
import { Nav } from "@/components/Nav";
import { PriorityBadge } from "@/components/Badges";
import { useScenarios } from "@/lib/data";
import type { ScenarioKey } from "@/lib/types";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function SimulatePage() {
  const { data: scenarios, loading } = useScenarios();
  const t = useT();

  return (
    <>
      <Nav />
      <main className="flex-1 bg-offwhite">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-bold text-navy">{t("sim.title")}</h1>
          <p className="mt-2 max-w-2xl text-ink-soft">{t("sim.intro")}</p>

          {loading && <div className="mt-10 text-sm text-slate-400">{t("sim.loading")}</div>}

          <Link href="/lab" className="button-primary mt-6">
            {t("sim.cta.lab")} ↗
          </Link>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {scenarios &&
              (Object.keys(scenarios) as ScenarioKey[]).map((key) => {
                const s = scenarios[key];
                return (
                  <Link
                    key={key}
                    href={`/simulate/${key}`}
                    className="group rounded-xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-bold tracking-wide text-cyan uppercase">
                        {t("sim.scenario")} {key}
                      </span>
                      <PriorityBadge cls={s.job.finalPriorityClass} variant="tape" />
                    </div>
                    <h2 className="mt-2 text-lg font-semibold text-navy">{t(`sim.tag.${key}`)}</h2>
                    <p className="mt-1 font-mono text-sm text-ink-soft">{s.job_id}</p>
                    <p className="mt-3 text-sm text-ink-soft">{t(`sim.summary.${key}`)}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ocean group-hover:gap-2 transition-all">
                      {t("sim.start")} →
                    </span>
                  </Link>
                );
              })}
          </div>

          <div className="mt-10 rounded-xl border border-ocean/30 bg-ocean/5 p-6">
            <h3 className="font-semibold text-navy">{t("sim.custom.title")}</h3>
            <p className="mt-1 text-sm text-ink-soft">{t("sim.custom.body")}</p>
            <Link
              href="/simulate/custom"
              className="mt-4 inline-flex items-center gap-1 rounded-md bg-ocean px-5 py-2.5 text-sm font-semibold text-white hover:bg-ocean-light"
            >
              {t("sim.custom.cta")} →
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
