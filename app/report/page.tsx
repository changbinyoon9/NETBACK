"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { MapViewLoader } from "@/components/MapViewLoader";
import { useMpaLayer } from "@/lib/data";
import { MpaLayerToggle } from "@/components/MpaLayerToggle";
import { useT, useTf } from "@/lib/i18n/LocaleProvider";
import { compressImageToDataUrl } from "@/lib/compressImage";

type Gear = "NET" | "TRAP" | "ROPE" | "OTHER";
const MAX_PHOTO_DATA_URL_LENGTH = 4_000_000;

export default function PublicReportPage() {
  const t = useT();
  const tf = useTf();
  const { data: mpaLayer } = useMpaLayer();
  const [picked, setPicked] = useState<[number, number] | null>(null);
  const [gear, setGear] = useState<Gear>("NET");
  const [title, setTitle] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [showMpa, setShowMpa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reportId, setReportId] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ gear: "NET"; confidence: number } | null>(null);
  const [aiChecked, setAiChecked] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError(t("publicReport.locationUnsupported"));
      return;
    }
    setLocating(true); setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (latitude < 32 || latitude > 40 || longitude < 124 || longitude > 133) {
          setLocationError(t("publicReport.locationOutsideCoverage"));
        } else {
          setPicked([latitude, longitude]);
          setFlyTo([latitude, longitude]);
        }
        setLocating(false);
      },
      (err) => {
        setLocationError(err.code === err.PERMISSION_DENIED ? t("publicReport.locationDenied") : t("publicReport.locationUnavailable"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true); setPhotoError(""); setAiSuggestion(null); setAiChecked(false);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      if (dataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
        setPhotoError(t("publicReport.photoTooLarge"));
        return;
      }
      setPhotoDataUrl(dataUrl);
      void classifyPhoto(dataUrl);
    } catch {
      setPhotoError(t("publicReport.photoReadError"));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function classifyPhoto(dataUrl: string) {
    setAiBusy(true);
    try {
      const res = await fetch("/api/classify-gear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoDataUrl: dataUrl }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.suggestion) {
        setAiSuggestion(data.suggestion);
        setGear(data.suggestion.gear);
      }
    } catch {
      // Silent: the AI suggestion is a convenience, not required to report.
    } finally {
      setAiBusy(false);
      setAiChecked(true);
    }
  }

  const GEAR_OPTIONS: { value: Gear; label: string }[] = [
    { value: "NET", label: t("opsForm.gear.net") },
    { value: "TRAP", label: t("opsForm.gear.trap") },
    { value: "ROPE", label: t("opsForm.gear.rope") },
    { value: "OTHER", label: t("opsForm.gear.other") },
  ];

  async function submit() {
    if (!picked) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createReport",
          actor: contact.trim() || t("publicReport.anonymous"),
          values: {
            title: title.trim() || t("opsForm.gear.net"),
            lat: picked[0],
            lon: picked[1],
            gear,
            notes,
            photoDataUrl: photoDataUrl ?? undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("live.engineFailed"));
      setReportId(data.reports[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("live.engineUnreachable"));
    } finally {
      setBusy(false);
    }
  }

  if (reportId) {
    return (
      <div className="netback-site">
        <Nav />
        <main className="mx-auto max-w-lg px-5 py-16 text-center">
          <h1 className="text-xl font-bold text-navy">{t("publicReport.submitted.title")}</h1>
          <p className="mt-2 text-sm text-ink-soft">{t("publicReport.submitted.body")}</p>
          <p className="mt-4 rounded-md border border-border bg-white px-4 py-3 font-mono text-sm text-navy">{reportId}</p>
          {photoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoDataUrl} alt="" className="mx-auto mt-4 h-32 w-32 rounded-md border border-border object-cover" />
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href={`/report/${reportId}`} className="rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-deep">
              {t("publicReport.submitted.check")}
            </Link>
            <button
              onClick={() => { setReportId(null); setPicked(null); setTitle(""); setNotes(""); setPhotoDataUrl(null); setPhotoError(""); }}
              className="rounded-md border border-border px-5 py-3 text-sm font-semibold text-navy hover:bg-offwhite"
            >
              {t("publicReport.submitted.another")}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="netback-site">
      <Nav />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="text-xl font-bold text-navy">{t("publicReport.title")}</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">{t("publicReport.subtitle")}</p>
        <p className="mt-2">
          <Link href={`/report/status`} className="text-sm font-semibold text-ocean hover:text-ocean-light">{t("publicReport.statusLink")}</Link>
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-500">{t("custom.location")}</span>
              <button
                type="button"
                disabled={locating}
                onClick={useMyLocation}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-ocean hover:border-ocean/40 disabled:opacity-50"
              >
                {locating ? (
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-ocean border-t-transparent" />
                ) : (
                  <span aria-hidden="true">📍</span>
                )}
                {locating ? t("publicReport.locating") : t("publicReport.useMyLocation")}
              </button>
            </div>
            {picked ? (
              <p className="mt-1 font-mono text-sm text-ink">{picked[0].toFixed(5)}, {picked[1].toFixed(5)}</p>
            ) : (
              <p className="mt-1 text-sm text-slate-400 italic">{t("publicReport.pickLocation")}</p>
            )}
            {locationError && <p className="mt-1 text-xs text-red-600">{locationError}</p>}

            <div className="mt-4">
              <span className="text-xs font-medium text-slate-500">{t("publicReport.photo")}</span>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handlePhotoChange} className="hidden" />
              {photoDataUrl ? (
                <div className="mt-2 flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoDataUrl} alt="" className="h-24 w-24 rounded-md border border-border object-cover" />
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:bg-offwhite">
                      {t("publicReport.photoRetake")}
                    </button>
                    <button type="button" onClick={() => { setPhotoDataUrl(null); setAiSuggestion(null); setAiChecked(false); }} className="text-xs font-medium text-red-600 hover:underline">
                      {t("publicReport.photoRemove")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={photoBusy}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 w-full rounded-md border border-dashed border-border px-3 py-3 text-sm font-medium text-ink-soft hover:border-ocean/40 hover:text-ocean disabled:opacity-50"
                >
                  {photoBusy ? t("publicReport.photoProcessing") : t("publicReport.photoChoose")}
                </button>
              )}
              {photoError && <p className="mt-1 text-xs text-red-600">{photoError}</p>}
              <p className="mt-1 text-xs text-slate-400 italic">{t("publicReport.photoHint")}</p>

              {aiBusy && (
                <p className="mt-2 flex items-center gap-2 text-xs text-ocean">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-ocean border-t-transparent" />
                  {t("publicReport.aiAnalyzing")}
                </p>
              )}
              {!aiBusy && aiChecked && (
                <div className="mt-2 rounded-md border border-ocean/30 bg-ocean/5 px-3 py-2">
                  <p className="text-xs font-semibold text-ocean">
                    {aiSuggestion
                      ? tf("publicReport.aiSuggestion", {
                          gear: t(`opsForm.gear.${aiSuggestion.gear.toLowerCase()}`),
                          pct: Math.round(aiSuggestion.confidence * 100),
                        })
                      : t("publicReport.aiSuggestionNone")}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4">
              <span className="text-xs font-medium text-slate-500">{t("opsForm.gearObserved")}</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {GEAR_OPTIONS.map((opt) => (
                  <label key={opt.value} className={`flex cursor-pointer items-center justify-center rounded-lg border p-3 text-sm transition-colors ${gear === opt.value ? "border-ocean bg-ocean/5 font-semibold text-ocean" : "border-border text-ink hover:border-ocean/30"}`}>
                    <input type="radio" name="gear" className="sr-only" checked={gear === opt.value} onChange={() => setGear(opt.value)} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-medium text-slate-500">{t("opsForm.reportTitle")}</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-medium text-slate-500">{t("publicReport.yourContact")}</span>
              <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={100} placeholder={t("publicReport.yourContactPlaceholder")} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-medium text-slate-500">{t("opsForm.whatObserved")}</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
            </label>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button
              disabled={!picked || busy}
              onClick={submit}
              className="mt-5 w-full rounded-md bg-ocean px-5 py-3 text-sm font-semibold text-white transition-opacity hover:bg-ocean-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? t("publicReport.submitting") : t("publicReport.submit")}
            </button>
            <p className="mt-3 text-xs text-slate-400 italic">{t("opsForm.reportHint")}</p>
          </div>

          <div className="h-[420px] lg:h-auto">
            <div className="mb-2 flex justify-end"><MpaLayerToggle checked={showMpa} onChange={setShowMpa} /></div>
            <MapViewLoader
              center={[36.3, 128.6]}
              zoom={7}
              pickedLocation={picked}
              flyTo={flyTo}
              onMapClick={(lat, lon) => { setPicked([lat, lon]); setFlyTo(null); }}
              heightClass="h-[380px] lg:h-[calc(100%-2rem)]"
              mpaLayer={mpaLayer}
              showMpa={showMpa}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
