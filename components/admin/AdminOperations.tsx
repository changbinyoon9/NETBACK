"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { GearIcon } from "@/components/GearArt";
import { isReserved, matchFleet, STAGES, type Command, type OperationsState, emptyState } from "@/lib/operations/model";
import { RecoveryScene, STEP_KEYS } from "@/components/operations/RecoveryScene";
import { RecordCategoryForm, NewReportForm, NewVesselForm, StepForm } from "@/components/operations/OperationsForms";
import { useLocale, useT, useTf } from "@/lib/i18n/LocaleProvider";
import { historyText } from "@/lib/i18n/history";
import { translateReason } from "@/lib/i18n/reasons";
const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);
const EXPLAIN_KEYS = ["studio.explain.0", "studio.explain.1", "studio.explain.2", "studio.explain.3", "studio.explain.4", "studio.explain.5"];

export function AdminOperations() {
  const t = useT(); const tf = useTf(); const { locale } = useLocale(); const dateLocale = locale === "ko" ? "ko-KR" : "en-GB";
  const [operations, setOperations] = useState<OperationsState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [actor, setActor] = useState("");
  const [panel, setPanel] = useState<"report" | "fleet" | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  const report = operations.reports.find((r) => r.id === selected) ?? operations.reports[0];
  const index = report ? STAGES.indexOf(report.stage) : -1;
  const matches = report ? matchFleet(operations, report) : [];
  const hold = report?.stage === "REVIEWED" && !matches.some((m) => m.eligible);

  const refresh = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/operations", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setOperations(data); setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("studio.error.loadFailed"));
    } finally {
      setBusy(false);
    }
  }, [t]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (panel) panelRef.current?.focus(); }, [panel]);

  async function send(cmd: Command) {
    if (saving.current) return false;
    saving.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/operations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t("studio.error.saveFailed"));
      setOperations(data);
      if (cmd.action === "createReport") setSelected(data.reports[0].id);
      setNotice(t("adminOps.saved"));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("studio.error.saveFailedKeep"));
      return false;
    } finally {
      saving.current = false; setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <main className="recovery-studio">
      <header className="studio-heading">
        <div>
          <p className="studio-eyebrow">{t("admin.tab.operations").toUpperCase()}</p>
          <h1>{t("adminOps.title")}</h1>
          <p>{t("adminOps.subtitle")}</p>
        </div>
        <div className="studio-mode">
          <GearIcon kind="knot" width={52} />
          <div>
            <button type="button" className="studio-outline" onClick={logout}>{t("adminOps.logout")}</button>
          </div>
        </div>
      </header>

      <div className="operator-bar">
        <label>{t("studio.operator.recordedBy")} <input aria-label={t("studio.operator.nameAria")} value={actor} onChange={(e) => setActor(e.target.value)} placeholder={t("studio.operator.namePlaceholder")} maxLength={100} /></label>
        <span>{t("studio.operator.notAuth")}</span>
        <button disabled={busy} onClick={() => void refresh()}>{t("studio.operator.refresh")}</button>
        <a href="/api/admin/export-photos" className="text-button">{t("adminOps.exportPhotos")}</a>
      </div>
      {error && <div className="studio-error" role="alert">{error} <button disabled={busy} onClick={() => void refresh()}>{t("studio.error.reload")}</button></div>}
      <div className="studio-save" role="status" aria-live="polite">{busy ? t("studio.status.busy") : notice}</div>

      <div className="studio-workspace">
        <aside className="harbor-ledger">
          <div className="ledger-heading"><GearIcon kind="buoy" width={36} /><h2>{t("studio.ledger.title")}</h2></div>
          <span className="studio-eyebrow">{tf("studio.ledger.registered", { count: operations.reports.length })}</span>
          {operations.reports.map((r) => (
            <button key={r.id} className={`ledger-entry ${report?.id === r.id ? "selected" : ""}`} onClick={() => setSelected(r.id)}>
              <span>{r.stage === "CLOSED" ? "✓" : "↗"} {r.id.slice(0, 11).toUpperCase()}</span>
              <strong>{r.title}</strong>
              <small>{t(STEP_KEYS[STAGES.indexOf(r.stage)])}</small>
            </button>
          ))}
          <button className="studio-outline" disabled={!loaded || busy} onClick={() => setPanel("report")}>{t("studio.ledger.newReport")}</button>
          <button className="fleet-link" disabled={!loaded || busy} onClick={() => setPanel("fleet")}>
            <GearIcon kind="vessel" width={40} /><span>{t("studio.ledger.manageFleet")} <b>{operations.vessels.length}</b></span>↗
          </button>
          <div className="ledger-bottom"><GearIcon kind="net" width={66} /><p>{t("studio.ledger.bottom.find")}<br />{t("studio.ledger.bottom.match")}<br /><em>{t("studio.ledger.bottom.bring")}</em></p></div>
        </aside>

        <section className="studio-center" aria-label="Recovery journey">
          <div className="mission-title">
            <div><span className="studio-eyebrow">{t("studio.mission.active")}</span><h2>{report?.title ?? t("studio.mission.emptyTitle")}</h2></div>
            <span className="mission-stamp">{t("studio.mission.stampLocal")}</span>
          </div>
          <RecoveryScene report={report} test={false} playing={false} />
          <ol className="rope-steps">
            {STEP_KEYS.map((key, i) => (
              <li key={key} className={i === index ? "current" : i < index ? "complete" : ""} aria-current={i === index ? "step" : undefined}>
                <span>{i < index ? "✓" : String(i + 1).padStart(2, "0")}</span><small>{t(key)}</small>
              </li>
            ))}
          </ol>
          {report && (
            <section className="studio-log">
              <div><h3>{t("studio.log.title")}</h3><span>{t("studio.log.operator")}</span></div>
              <ol>
                {report.history.slice().reverse().map((entry, i) => (
                  <li key={`${entry.at}-${i}`}><time>{new Date(entry.at).toLocaleString(dateLocale)}</time><p>{historyText(entry.text,dateLocale === "ko-KR" ? "ko" : "en")}<small>{entry.actor}</small></p></li>
                ))}
              </ol>
            </section>
          )}
        </section>

        <aside className="field-card" aria-label="Current stage actions">
          <div className="field-card-top"><span>{t("studio.field.card")}</span><span>{index < 0 ? "—" : tf("studio.field.progress", { n: String(index + 1).padStart(2, "0") })}</span></div>
          {!report ? (
            <div className="empty-harbor">
              <GearIcon kind="buoy" width={100} />
              <h2>{t("studio.field.empty.title")}</h2>
              <p>{t("studio.field.empty.body")}</p>
              <button className="studio-primary" disabled={!loaded || busy} onClick={() => setPanel("report")}>{t("studio.field.empty.cta")}</button>
            </div>
          ) : (
            <>
              <h2>{t(STEP_KEYS[index])}</h2>
              <p className="field-intro">{t(EXPLAIN_KEYS[index])}</p>
              <div className="report-coordinates"><span>{report.gear} / {report.lat.toFixed(4)}° N</span><span>{report.lon.toFixed(4)}° E</span></div>
              {report.photoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={report.photoDataUrl} alt={t("common.photo")} className="mt-3 max-h-64 w-full rounded-md border border-border object-cover" />
              )}
              {index === 0 && <p className="report-note">{report.notes}</p>}
              {report.review && (
                <dl className="condition-readings">
                  <div><dt>{t("studio.field.depth")}</dt><dd>{report.review.depth}<small>m</small></dd></div>
                  <div><dt>{t("studio.field.wave")}</dt><dd>{report.review.wave}<small>m</small></dd></div>
                  <div><dt>{t("studio.field.budget")}</dt><dd>{money(report.review.budget)}</dd></div>
                </dl>
              )}
              {index === 1 && (
                <>
                  <div className={hold ? "match-hold" : "match-ready"}>
                    {hold ? t("studio.match.hold") : tf("studio.match.ready", { count: matches.filter((m) => m.eligible).length, word: matches.filter((m) => m.eligible).length === 1 ? t("studio.match.vesselSingular") : t("studio.match.vesselPlural") })}
                  </div>
                  <div className="fleet-matches">
                    {matches.map((m) => (
                      <div key={m.vessel.id} className={m.eligible ? "fleet-match" : "fleet-match rejected"}>
                        <GearIcon kind="vessel" width={40} />
                        <div>
                          <strong>{m.vessel.name}</strong>
                          <small>{m.distance.toFixed(1)} km, {money(m.cost)}</small>
                          <p>{m.eligible ? tf("studio.match.within", { hours: m.hours.toFixed(1) }) : m.reasons.map((r) => translateReason(t, r)).join(", ")}</p>
                          {m.eligible && <button disabled={busy || !actor.trim()} onClick={() => void send({ action: "assign", actor, id: report.id, revision: report.revision, values: { vesselId: m.vessel.id } })}>{t("studio.match.reserve")}</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="studio-hint">{t("studio.match.hint")}</p>
                  {matches.length === 0 && <button className="studio-outline" onClick={() => setPanel("fleet")}>{t("studio.match.registerVessel")}</button>}
                </>
              )}
              {report.assignment && (
                <div className="assignment-tag">
                  <GearIcon kind="vessel" width={46} />
                  <div><small>{t("studio.assignment.selected")}</small><strong>{report.assignment.vesselName}</strong><span>{tf("studio.assignment.estimated", { amount: money(report.assignment.estimatedCost) })}</span></div>
                </div>
              )}
              {report.outcome && (
                <div className={`outcome-slip ${report.outcome.result === "Failed" ? "failed" : ""}`}>
                  <span>{report.outcome.result === "Failed" ? t("studio.outcome.failed") : report.outcome.result === "Partial" ? t("studio.outcome.partial") : t("studio.outcome.recovered")}</span>
                  <strong>{report.outcome.weight}<small> kg</small></strong>
                  <p>{tf("studio.outcome.actualCost", { amount: money(report.outcome.actualCost) })}</p>
                  <p>{report.outcome.note}</p>
                </div>
              )}
              {report.compensation && (
                <div className={`outcome-slip compensation-slip status-${report.compensation.status.toLowerCase()}`}>
                  <span>{t(`opsForm.compensation.${report.compensation.status.toLowerCase()}`)}</span>
                  <strong>{money(report.compensation.amountKrw)}</strong>
                  <p>{report.compensation.note}</p>
                </div>
              )}
              {index < 5 ? (index === 1 ? (
                <details className="review-details"><summary>{t("studio.reviewSummary")}</summary><StepForm report={report} send={send} actor={actor} busy={busy} /></details>
              ) : (
                <StepForm report={report} send={send} actor={actor} busy={busy} />
              )) : (report.outcome && report.outcome.result !== "Failed" && <StepForm report={report} send={send} actor={actor} busy={busy} />)}
              {index === 2 && <button className="text-button" disabled={busy || !actor.trim()} onClick={() => void send({ action: "release", id: report.id, revision: report.revision, actor, values: {} })}>{t("studio.release")}</button>}
              {index === 5 && report.outcome && <RecordCategoryForm report={report} send={send} actor={actor} busy={busy}/> }
              {index === 5 && <p className="studio-hint">{t("studio.closedHint")} {report.outcome?.result === "Failed" ? t("studio.closedHint.newReport") : tf("studio.closedHint.destination", { destination: report.outcome?.disposition ?? "" })}</p>}
            </>
          )}
        </aside>
      </div>

      {panel && (
        <section ref={panelRef} tabIndex={-1} className="studio-drawer" aria-label={panel === "report" ? t("studio.drawer.newReport") : t("studio.drawer.fleet")}>
          <div className="drawer-heading">
            <div><span className="studio-eyebrow">{t("studio.drawer.eyebrow")}</span><h2>{panel === "report" ? t("studio.drawer.sendSignal") : t("studio.drawer.knowCrew")}</h2></div>
            <button className="studio-outline" onClick={() => setPanel(null)}>{t("studio.drawer.close")}</button>
          </div>
          {!actor.trim() && <p className="studio-error">{t("studio.drawer.nameRequired")}</p>}
          {panel === "report" ? (
            <NewReportForm send={send} actor={actor} busy={busy} done={() => setPanel(null)} />
          ) : (
            <div className="fleet-drawer-grid">
              <div><h3>{t("studio.drawer.registerVessel")}</h3><NewVesselForm send={send} actor={actor} busy={busy} /></div>
              <div>
                <h3>{t("studio.drawer.declaredAvailability")}</h3>
                {operations.vessels.length === 0 && <p>{t("studio.drawer.noVessels")}</p>}
                {operations.vessels.map((v) => (
                  <div className="vessel-register" key={v.id}>
                    <GearIcon kind="vessel" width={48} />
                    <div>
                      <strong>{v.name}</strong>
                      <p>{v.gear.join(", ")}, {tf("studio.drawer.depthWave", { depth: v.maxDepth, wave: v.maxWave })}</p>
                      <small>{tf("studio.drawer.updated", { date: new Date(v.updatedAt).toLocaleString(dateLocale) })}</small>
                      <button disabled={busy || !actor.trim() || isReserved(operations, v.id)} onClick={() => void send({ action: "availability", id: v.id, actor, values: { available: !v.available } })}>
                        {isReserved(operations, v.id) ? t("studio.drawer.reserved") : v.available ? t("studio.drawer.markUnavailable") : t("studio.drawer.markAvailable")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
