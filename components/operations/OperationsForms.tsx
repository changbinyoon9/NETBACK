import type { FormEvent, ReactNode } from "react";
import type { Command, Report } from "@/lib/operations/model";
import { useT, useTf } from "@/lib/i18n/LocaleProvider";
type Props = { send: (command: Command) => Promise<boolean>; actor: string; busy: boolean; done?: () => void };
function values(event: FormEvent<HTMLFormElement>) {
  event.preventDefault(); const form = event.currentTarget; const result: Record<string, unknown> = Object.fromEntries(new FormData(form));
  for (const input of Array.from(form.querySelectorAll<HTMLInputElement>('input[type="number"]'))) result[input.name] = input.value === "" ? null : Number(input.value);
  for (const input of Array.from(form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))) result[input.name] = input.checked;
  return result;
}
export function Field({ label, name, type = "text", value, min, max, step = "any", required = true }: { label: string; name: string; type?: string; value?: string | number; min?: number; max?: number; step?: string; required?: boolean }) {
  return <label className="studio-field"><span>{label}</span><input name={name} type={type} defaultValue={value} min={min} max={max} step={step} required={required} maxLength={type === "text" ? 200 : undefined}/></label>;
}
export function Check({ name, children }: { name: string; children: ReactNode }) { return <label className="studio-check"><input type="checkbox" name={name} required/><span>{children}</span></label>; }
function Note({ label, name = "note", value }: { label?: string; name?: string; value?: string }) { const t = useT(); return <label className="studio-field"><span>{label ?? t("opsForm.fieldNote")}</span><textarea name={name} required defaultValue={value} maxLength={2000} rows={3}/></label>; }
export function NewReportForm({ send, actor, busy, done }: Props) {
  const t = useT();
  return <form className="studio-form" onSubmit={async e => { if (await send({ action:"createReport", actor, values:values(e) })) done?.(); }}>
    <Field label={t("opsForm.reportTitle")} name="title"/><div className="studio-form-grid"><Field label={t("opsForm.lat")} name="lat" type="number" min={32} max={40}/><Field label={t("opsForm.lon")} name="lon" type="number" min={124} max={133}/></div>
    <label className="studio-field"><span>{t("opsForm.gearObserved")}</span><select name="gear"><option value="NET">{t("opsForm.gear.net")}</option><option value="TRAP">{t("opsForm.gear.trap")}</option><option value="ROPE">{t("opsForm.gear.rope")}</option><option value="OTHER">{t("opsForm.gear.other")}</option></select></label><Note label={t("opsForm.whatObserved")} name="notes"/>
    <p className="studio-hint">{t("opsForm.reportHint")}</p><button className="studio-primary" disabled={busy || !actor.trim()}>{t("opsForm.registerReport")}</button>
  </form>;
}
export function NewVesselForm({ send, actor, busy, done }: Props) {
  const t = useT();
  return <form className="studio-form" onSubmit={async e => { const data=values(e); data.gear=[data.gear]; if(await send({action:"createVessel",actor,values:data}))done?.(); }}>
    <Field label={t("opsForm.vesselName")} name="name"/><div className="studio-form-grid"><Field label={t("opsForm.baseLat")} name="lat" type="number" min={32} max={40}/><Field label={t("opsForm.baseLon")} name="lon" type="number" min={124} max={133}/><Field label={t("opsForm.workingDepth")} name="maxDepth" type="number" min={1} max={1500}/><Field label={t("opsForm.waveLimit")} name="maxWave" type="number" min={0} max={5}/><Field label={t("opsForm.cruisingSpeed")} name="speed" type="number" min={1} max={30}/><Field label={t("opsForm.hourlyCost")} name="hourlyCost" type="number" min={1} max={10000000}/></div>
    <label className="studio-field"><span>{t("opsForm.equipmentSupports")}</span><select name="gear"><option value="NET">{t("opsForm.gear.net")}</option><option value="TRAP">{t("opsForm.gear.trap")}</option><option value="ROPE">{t("opsForm.gear.rope")}</option><option value="OTHER">{t("opsForm.gear.other")}</option></select></label>
    <Check name="confirmed">{t("opsForm.capabilitiesChecked")}</Check><button className="studio-primary" disabled={busy || !actor.trim()}>{t("opsForm.addFleet")}</button>
  </form>;
}
export function StepForm({ report, send, actor, busy }: Props & { report: Report }) {
  const t = useT(); const tf = useTf();
  const stage=report.stage; const review=report.review; const compensation=report.compensation;
  const action = stage==="REPORTED" || stage==="REVIEWED" ? "review" : stage==="ASSIGNED" ? "start" : stage==="UNDERWAY" ? "outcome" : stage==="RETURNED" ? "close" : "compensation";
  return <form className="studio-form" key={`${report.id}-${stage}-${compensation?.status ?? ""}`} onSubmit={async e=>{await send({action,id:report.id,revision:report.revision,actor,values:values(e)});}}>
    {(stage==="REPORTED"||stage==="REVIEWED")&&<><div className="studio-form-grid"><Field label={t("opsForm.workingDepth")} name="depth" type="number" min={0} max={1500} value={review?.depth}/><Field label={t("opsForm.waveHeight")} name="wave" type="number" min={0} max={5} value={review?.wave}/><Field label={t("opsForm.budgetWon")} name="budget" type="number" min={0} max={1000000000} value={review?.budget}/><Field label={t("opsForm.searchRadius")} name="radius" type="number" min={.1} max={200} value={review?.radius}/><Field label={t("opsForm.onSiteHours")} name="hours" type="number" min={.5} max={48} value={review?.hours}/></div><Note label={t("opsForm.reviewNote")} value={review?.note}/><Check name="locationChecked">{t("opsForm.reviewConfirm")}</Check></>}
    {stage==="ASSIGNED"&&<><p className="studio-hint">{tf("opsForm.contactOutside", { vessel: report.assignment?.vesselName ?? "" })}</p><Check name="crewConfirmed">{t("opsForm.crewAccepted")}</Check><Check name="safetyConfirmed">{t("opsForm.safetyChecks")}</Check><Note label={t("opsForm.departureNote")}/></>}
    {stage==="UNDERWAY"&&<><label className="studio-field"><span>{t("opsForm.observedOutcome")}</span><select name="result"><option value="Recovered">{t("studio.test.recovered")}</option><option value="Partial">{t("studio.test.partial")}</option><option value="Failed">{t("studio.test.failed")}</option></select></label><div className="studio-form-grid"><Field label={t("opsForm.recoveredWeight")} name="weight" type="number" min={0} max={1000000}/><Field label={t("opsForm.actualCost")} name="actualCost" type="number" min={0} max={1000000000}/></div><Field label={t("opsForm.evidenceRef")} name="evidence"/><Field label={t("opsForm.materialDestination")} name="disposition" required={false}/><Note label={t("opsForm.outcomeNotes")}/><p className="studio-hint">{t("opsForm.evidenceHint")}</p></>}
    {stage==="RETURNED"&&<><p className="studio-hint">{tf("opsForm.evidenceDestination", { evidence: report.outcome?.evidence ?? "" })}<br/>{tf("opsForm.destination", { destination: report.outcome?.disposition ?? "" })}</p><Check name="evidenceChecked">{t("opsForm.evidenceChecked")}</Check></>}
    {stage==="CLOSED"&&<><div className="studio-form-grid"><Field label={t("opsForm.compensationRate")} name="rateKrwPerKg" type="number" min={0} max={1000000} value={compensation?.rateKrwPerKg}/></div><label className="studio-field"><span>{t("opsForm.compensationStatus")}</span><select name="status" defaultValue={compensation?.status ?? "REQUESTED"}><option value="REQUESTED">{t("opsForm.compensation.requested")}</option><option value="APPROVED">{t("opsForm.compensation.approved")}</option><option value="PAID">{t("opsForm.compensation.paid")}</option></select></label><Note label={t("opsForm.compensationNote")} value={compensation?.note}/></>}
    <button className="studio-primary" disabled={busy||!actor.trim()}>{busy?t("opsForm.saving"):action==="review"?t("opsForm.saveReview"):action==="start"?t("opsForm.recordDeparture"):action==="outcome"?t("opsForm.saveOutcome"):action==="close"?t("opsForm.closeRecord"):t("opsForm.saveCompensation")}</button>
  </form>;
}

export function RecordCategoryForm({report,send,actor,busy}: Props & {report:Report}){
 const t=useT();
 return <details className="review-details"><summary>{t("record.category")}: {t(report.outcome?.recordKind==="FIELD"?"record.field":report.outcome?.recordKind==="EXERCISE"?"record.exercise":"record.pending")}</summary><form className="studio-form" key={`${report.id}-${report.revision}`} onSubmit={async e=>{await send({action:"classifyRecord",id:report.id,revision:report.revision,actor,values:values(e)});}}>
 <label className="studio-field"><span>{t("record.category")}</span><select name="recordKind" required defaultValue={report.outcome?.recordKind??""}><option value="" disabled>{t("record.choose")}</option><option value="FIELD">{t("record.field")}</option><option value="EXERCISE">{t("record.exercise")}</option></select></label><Note label={t("record.note")}/><Check name="confirmed">{t("record.confirm")}</Check><button className="studio-primary" disabled={busy||!actor.trim()}>{t("record.save")}</button></form></details>;
}
