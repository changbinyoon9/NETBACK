"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Nav } from "@/components/Nav";
import { STAGES } from "@/lib/operations/model";
import { STEP_KEYS } from "@/components/operations/RecoveryScene";
import { useLocale, useT } from "@/lib/i18n/LocaleProvider";
import "../../lab/studio.css";

interface PublicReport {
  id: string;
  title: string;
  lat: number;
  lon: number;
  gear: string;
  stage: (typeof STAGES)[number];
  reportedAt: string;
  history: { at: string; text: string; actor: string }[];
  photoDataUrl: string | null;
}

export default function ReportStatusPage() {
  const t = useT();
  const { locale } = useLocale();
  const params = useParams<{ id: string }>();
  const [report, setReport] = useState<PublicReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/reports/${encodeURIComponent(params.id)}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(data.error ?? t("publicStatus.notFound")); return; }
        setReport(data);
      })
      .catch(() => { if (!cancelled) setError(t("publicStatus.notFound")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id, t]);

  const index = report ? STAGES.indexOf(report.stage) : -1;

  return (
    <div className="netback-site">
      <Nav />
      <main className="mx-auto max-w-lg px-5 py-12">
        <h1 className="text-xl font-bold text-navy">{t("publicStatus.title")}</h1>
        <p className="mt-1 font-mono text-sm text-ink-soft">{params.id}</p>

        {loading && <p className="mt-6 text-sm text-ink-soft">{t("studio.status.busy")}</p>}
        {!loading && error && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="font-bold text-amber-800">{error}</p>
            <Link href="/report/status" className="mt-3 inline-block text-sm font-semibold text-ocean hover:text-ocean-light">{t("publicStatus.reportLink")}</Link>
          </div>
        )}
        {!loading && report && (
          <div className="mt-6 rounded-xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              {report.photoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={report.photoDataUrl} alt="" className="h-16 w-16 flex-none rounded-md border border-border object-cover" />
              )}
              <div>
                <h2 className="text-lg font-semibold text-navy">{report.title}</h2>
                <p className="mt-1 text-sm text-ink-soft">{report.lat.toFixed(4)}° N, {report.lon.toFixed(4)}° E</p>
              </div>
            </div>
            <ol className="rope-steps mt-5">
              {STEP_KEYS.map((key, i) => (
                <li key={key} className={i === index ? "current" : i < index ? "complete" : ""}>
                  <span>{i < index ? "✓" : String(i + 1).padStart(2, "0")}</span><small>{t(key)}</small>
                </li>
              ))}
            </ol>
            <ol className="mt-6 space-y-3 border-t border-border pt-4">
              {report.history.slice().reverse().map((entry, i) => (
                <li key={i} className="text-sm">
                  <time className="block text-xs text-slate-400">{new Date(entry.at).toLocaleString(locale === "ko" ? "ko-KR" : "en-GB")}</time>
                  <p className="text-ink">{entry.text}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}
