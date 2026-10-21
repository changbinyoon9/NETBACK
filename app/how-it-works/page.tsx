"use client";

import Link from "next/link";
import { ServiceFaq } from "@/components/ServiceAccess";
import { Nav } from "@/components/Nav";
import { useT } from "@/lib/i18n/LocaleProvider";

const STEP_KEYS = ["report", "verify", "prioritize", "match", "recover", "verifyRecovery"] as const;

export default function HowItWorks() {
  const t = useT();

  return (
    <>
      <Nav />
      <main className="flex-1 bg-offwhite">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <p className="text-sm font-semibold tracking-wide text-ocean uppercase">{t("how.kicker")}</p>
          <h1 className="mt-2 text-3xl font-bold text-navy">{t("how.title")}</h1>
          <p className="mt-3 text-ink-soft">{t("how.intro")}</p>

          <ol className="mt-10 space-y-6">
            {STEP_KEYS.map((key, i) => (
              <li key={key} className="flex gap-4 rounded-xl border border-border bg-white p-5 shadow-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                  {i + 1}
                </div>
                <div>
                  <h2 className="font-semibold text-navy">{t(`how.step.${key}.title`)}</h2>
                  <p className="mt-1 text-sm text-ink-soft">{t(`how.step.${key}.body`)}</p>
                </div>
              </li>
            ))}
          </ol>

          <details className="mt-10 border-y border-border py-5 text-sm text-ink-soft">
            <summary className="cursor-pointer font-semibold text-navy">{t("how.disclaimer.title")}</summary>
            <p className="mt-1">{t("how.disclaimer.body")}</p>
          </details>
          <ServiceFaq />

          <Link
            href="/simulate"
            className="mt-8 inline-block rounded-md bg-ocean px-6 py-3 text-sm font-semibold text-white hover:bg-ocean-light"
          >
            {t("how.cta")}
          </Link>
        </div>
      </main>
    </>
  );
}
