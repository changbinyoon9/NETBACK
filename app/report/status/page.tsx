"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function ReportStatusLookupPage() {
  const t = useT();
  const router = useRouter();
  const [id, setId] = useState("");

  return (
    <div className="netback-site">
      <Nav />
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-xl font-bold text-navy">{t("publicStatus.title")}</h1>
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (id.trim()) router.push(`/report/${encodeURIComponent(id.trim())}`);
          }}
        >
          <label className="block">
            <span className="text-xs font-medium text-slate-500">{t("publicStatus.idLabel")}</span>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder={t("publicStatus.idPlaceholder")}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 font-mono text-sm"
              autoFocus
            />
          </label>
          <button disabled={!id.trim()} className="mt-4 w-full rounded-md bg-ocean px-5 py-3 text-sm font-semibold text-white hover:bg-ocean-light disabled:cursor-not-allowed disabled:opacity-40">
            {t("publicStatus.lookup")}
          </button>
        </form>
        <p className="mt-6 text-center">
          <Link href="/report" className="text-sm font-semibold text-ocean hover:text-ocean-light">{t("publicStatus.reportLink")}</Link>
        </p>
      </main>
    </div>
  );
}
