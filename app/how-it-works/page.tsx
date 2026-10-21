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

          <ol className="relative mt-12 border-l border-border pl-8">
            {STEP_KEYS.map((key, i) => (
              <li key={key} className={i < STEP_KEYS.length - 1 ? "pb-10" : ""}>
                <span className="absolute -left-[15px] flex h-[29px] w-[29px] items-center justify-center rounded-full border-2 border-navy bg-offwhite font-mono text-xs font-bold text-navy">
                  {i + 1}
                </span>
                <h2 className="font-semibold text-navy">{t(`how.step.${key}.title`)}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{t(`how.step.${key}.body`)}</p>
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
