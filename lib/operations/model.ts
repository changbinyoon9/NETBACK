export const STAGES = ["REPORTED", "REVIEWED", "ASSIGNED", "UNDERWAY", "RETURNED", "CLOSED"] as const;
export type Stage = (typeof STAGES)[number];
export type Gear = "NET" | "TRAP" | "ROPE" | "OTHER";
export type Outcome = "Recovered" | "Partial" | "Failed";
export type Vessel = {
  id: string; name: string; lat: number; lon: number; maxDepth: number;
  maxWave: number; gear: Gear[]; speed: number; hourlyCost: number;
  available: boolean; updatedAt: string;
};
export type LogEntry = { at: string; text: string; actor: string };
export type Report = {
  id: string; revision: number; title: string; lat: number; lon: number;
  gear: Gear; notes: string; reportedAt: string; stage: Stage;
  photoDataUrl?: string;
  review?: { depth: number; wave: number; budget: number; radius: number; hours: number; note: string; reviewer: string };
  assignment?: { vesselId: string; vesselName: string; distance: number; estimatedCost: number; estimatedHours: number };
  outcome?: { result: Outcome; weight: number; actualCost: number; evidence: string; note: string; disposition: string };
  history: LogEntry[];
};
export type OperationsState = { schema: 1; reports: Report[]; vessels: Vessel[] };
export const emptyState = (): OperationsState => ({ schema: 1, reports: [], vessels: [] });
export class WorkflowError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export type Command = {
  action: "createReport" | "createVessel" | "availability" | "review" | "assign" | "release" | "start" | "outcome" | "close";
  id?: string; revision?: number; actor?: string; values: Record<string, unknown>;
};
const GEARS: Gear[] = ["NET", "TRAP", "ROPE", "OTHER"];
function text(v: unknown, label: string, max = 1000): string {
  if (typeof v !== "string" || !v.trim() || v.length > max) throw new WorkflowError(`${label} is required (up to ${max} characters).`);
  return v.trim();
}
function number(v: unknown, label: string, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) throw new WorkflowError(`${label} must be between ${min} and ${max}.`);
  return v;
}
function gear(v: unknown): Gear {
  if (!GEARS.includes(v as Gear)) throw new WorkflowError("Choose a gear type.");
  return v as Gear;
}
function checked(v: unknown, message: string) { if (v !== true) throw new WorkflowError(message); }
const MAX_PHOTO_DATA_URL_LENGTH = 4_000_000; // ~3MB of decoded image, base64-inflated
function photoDataUrl(v: unknown): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(v)) {
    throw new WorkflowError("Photo must be a JPEG, PNG or WebP image.");
  }
  if (v.length > MAX_PHOTO_DATA_URL_LENGTH) throw new WorkflowError("Photo is too large (max ~3MB).");
  return v;
}
export function distanceKm(a: {lat:number;lon:number}, b: {lat:number;lon:number}) {
  const rad = Math.PI / 180; const dLat = (b.lat - a.lat) * rad; const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(Math.min(1,h)),Math.sqrt(Math.max(0,1-h)));
}
export function isReserved(state: OperationsState, vesselId: string, exceptId?: string) {
  return state.reports.some(r => r.id !== exceptId && r.assignment?.vesselId === vesselId && ["ASSIGNED", "UNDERWAY"].includes(r.stage));
}
export function matchFleet(state: OperationsState, report: Report) {
  return state.vessels.map(vessel => {
    const review = report.review; const distance = distanceKm(report,vessel);
    const hours = review ? review.hours + 2 * distance / (vessel.speed * 1.852) : 0;
    const cost = Math.round(hours * vessel.hourlyCost);
    const reasons: string[] = [];
    if (!review) reasons.push("Review needed");
    if (!vessel.available) reasons.push("Unavailable");
    if (isReserved(state,vessel.id,report.id)) reasons.push("Already assigned");
    if (!vessel.gear.includes(report.gear)) reasons.push("Equipment mismatch");
    if (review) {
      if (review.depth > vessel.maxDepth) reasons.push("Depth limit");
      if (review.wave > vessel.maxWave) reasons.push("Weather limit");
      if (distance > review.radius) reasons.push("Outside search radius");
      if (cost > review.budget) reasons.push("Over budget");
    }
    return { vessel, distance, hours, cost, reasons, eligible: reasons.length === 0 };
  }).sort((a,b) => Number(b.eligible)-Number(a.eligible) || a.cost-b.cost || a.vessel.id.localeCompare(b.vessel.id));
}
export function applyCommand(state: OperationsState, raw: unknown, context: { now: string; id: string }): OperationsState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new WorkflowError("Invalid command.");
  const cmd = raw as Command;
  if (!cmd.values || typeof cmd.values !== "object" || Array.isArray(cmd.values)) throw new WorkflowError("Command values are required.");
  const next = structuredClone(state); const v = cmd.values;
  const actor = text(cmd.actor, "Recorder", 100);
  const event = (message: string): LogEntry => ({ at:context.now, text:message, actor });
  if (cmd.action === "createReport") {
    if (next.reports.length >= 1000) throw new WorkflowError("Local workspace has reached its 1,000-report limit. Export records before expanding storage.");
    next.reports.unshift({ id:context.id, revision:1, title:text(v.title,"Report title",120), lat:number(v.lat,"Latitude",32,40), lon:number(v.lon,"Longitude",124,133), gear:gear(v.gear), notes:typeof v.notes === "string" ? v.notes.slice(0,2000) : "", photoDataUrl:photoDataUrl(v.photoDataUrl), reportedAt:context.now, stage:"REPORTED", history:[event("Report registered. Field verification pending.")] });
    return next;
  }
  if (cmd.action === "createVessel") {
    if (next.vessels.length >= 200) throw new WorkflowError("Local fleet limit reached (200 vessels).");
    if (!Array.isArray(v.gear) || !v.gear.length || v.gear.length>4) throw new WorkflowError("Select supported gear.");
    checked(v.confirmed,"Confirm that the entered vessel capabilities have been checked.");
    next.vessels.push({ id:context.id, name:text(v.name,"Vessel name",100), lat:number(v.lat,"Base latitude",32,40), lon:number(v.lon,"Base longitude",124,133), maxDepth:number(v.maxDepth,"Working depth",1,1500), maxWave:number(v.maxWave,"Wave threshold",0,5), gear:[...new Set(v.gear.map(gear))], speed:number(v.speed,"Speed",1,30), hourlyCost:number(v.hourlyCost,"Hourly operating cost",1,10000000), available:true, updatedAt:context.now });
    return next;
  }
  if (cmd.action === "availability") {
    const vessel=next.vessels.find(x=>x.id===cmd.id);
    if (!vessel) throw new WorkflowError("Vessel not found.",404);
    if (isReserved(next,vessel.id)) throw new WorkflowError("Release the assignment before changing availability.",409);
    if (typeof v.available !== "boolean") throw new WorkflowError("Availability must be true or false.");
    vessel.available=v.available; vessel.updatedAt=context.now;return next;
  }
  const report=next.reports.find(r=>r.id===cmd.id);
  if (!report) throw new WorkflowError("Report not found.",404);
  if (cmd.revision !== report.revision) throw new WorkflowError("This report changed in another view. Refresh and review the latest record.",409);
  const requireStage=(...allowed:Stage[])=>{if(!allowed.includes(report.stage))throw new WorkflowError("This action is not available at the current stage.",409);};
  let message="";
  switch(cmd.action) {
    case "review":
      requireStage("REPORTED","REVIEWED"); checked(v.locationChecked,"Confirm the location and gear have been reviewed.");
      report.review={depth:number(v.depth,"Working depth",0,1500),wave:number(v.wave,"Wave height",0,5),budget:number(v.budget,"Budget",0,1000000000),radius:number(v.radius,"Search radius",.1,200),hours:number(v.hours,"On-site work hours",.5,48),note:text(v.note,"Review note",2000),reviewer:actor};
      report.stage="REVIEWED";message="Location and operating conditions reviewed. Fleet matching enabled.";break;
    case "assign": {
      requireStage("REVIEWED");
      const match=matchFleet(next,report).find(m=>m.vessel.id===v.vesselId);
      if (!match || !match.eligible) throw new WorkflowError(`Vessel cannot be assigned: ${match?.reasons.join(", ") || "not registered"}.`,409);
      report.assignment={vesselId:match.vessel.id,vesselName:match.vessel.name,distance:match.distance,estimatedCost:match.cost,estimatedHours:match.hours};
      report.stage="ASSIGNED";message=`${match.vessel.name} reserved locally. Crew acceptance still required; no message sent.`;break;
    }
    case "release":
      requireStage("ASSIGNED");report.assignment=undefined;report.stage="REVIEWED";message="Assignment released. Ready to select another vessel.";break;
    case "start":
      requireStage("ASSIGNED");checked(v.crewConfirmed,"Record crew acceptance before starting.");checked(v.safetyConfirmed,"Confirm operational checks before starting.");
      message=`Departure recorded by operator. ${text(v.note,"Confirmation note",2000)}`;report.stage="UNDERWAY";break;
    case "outcome": {
      requireStage("UNDERWAY");
      if (!["Recovered","Partial","Failed"].includes(String(v.result))) throw new WorkflowError("Choose an outcome.");
      const result=v.result as Outcome;const weight=number(v.weight,"Recovered weight",0,1000000);
      if (result==="Failed"&&weight!==0) throw new WorkflowError("A failed attempt must record zero recovered weight.");
      if (result!=="Failed"&&weight<=0) throw new WorkflowError("Enter a positive recovered weight.");
      report.outcome={result,weight,actualCost:number(v.actualCost,"Actual cost",0,1000000000),evidence:text(v.evidence,"Evidence reference",500),note:text(v.note,"Outcome note",2000),disposition:result==="Failed"?"Not applicable":text(v.disposition,"Material destination",200)};
      report.stage="RETURNED";message=`Outcome recorded: ${result}, ${weight} kg. Evidence review pending.`;break;
    }
    case "close":
      requireStage("RETURNED");checked(v.evidenceChecked,"Confirm that the evidence reference and outcome have been checked.");
      report.stage="CLOSED";message=report.outcome?.result==="Failed"?"Attempt closed without recovery. Re-survey or a new report may be needed.":"Evidence review recorded. Recovery record closed.";break;
    default:throw new WorkflowError("Unsupported action.");
  }
  report.revision++;report.history.push(event(message));return next;
}

export function demoState(rough = false): OperationsState {
  const now="2026-01-01T09:00:00.000Z";
  return { schema:1, reports:[{id:"TEST-001",revision:1,title:"A net near the reef",lat:34.83583,lon:128.43333,gear:"NET",notes:"Fictional training report at a historical study coordinate. No current incident is implied.",reportedAt:now,stage:"REPORTED",history:[{at:now,text:rough?"Training signal received. Rough water is expected.":"Training signal received. A lost net needs a way home.",actor:"Test scenario"}]}],vessels:[
    {id:"TEST-V1",name:"Tidekeeper · demo",lat:34.82,lon:128.42,maxDepth:80,maxWave:1.5,gear:["NET","ROPE"],speed:9,hourlyCost:180000,available:true,updatedAt:now},
    {id:"TEST-V2",name:"Blue Knot · demo",lat:34.86,lon:128.47,maxDepth:150,maxWave:2,gear:["NET","TRAP","ROPE"],speed:8,hourlyCost:240000,available:true,updatedAt:now},
    {id:"TEST-V3",name:"Little Buoy · demo",lat:34.83,lon:128.43,maxDepth:15,maxWave:1,gear:["TRAP"],speed:6,hourlyCost:100000,available:true,updatedAt:now}
  ]};
}
export function nextDemoCommand(report: Report, state:OperationsState, rough:boolean, outcome:Outcome): Command | null {
  const base={id:report.id,revision:report.revision,actor:"Test scenario"};
  switch(report.stage){
    case "REPORTED":return {...base,action:"review",values:{depth:24,wave:rough?2.8:.7,budget:2000000,radius:15,hours:2,note:"Training-only review; conditions are hypothetical.",locationChecked:true}};
    case "REVIEWED":{const best=matchFleet(state,report).find(m=>m.eligible);return best?{...base,action:"assign",values:{vesselId:best.vessel.id}}:null;}
    case "ASSIGNED":return {...base,action:"start",values:{crewConfirmed:true,safetyConfirmed:true,note:"Demo crew acceptance and checks; no external contact."}};
    case "UNDERWAY":return {...base,action:"outcome",values:{result:outcome,weight:outcome==="Failed"?0:outcome==="Partial"?18:42,actualCost:620000,evidence:"TEST-PHOTO-001 (fictional)",note:"Scripted training outcome, not observed recovery.",disposition:"Demonstration landing point"}};
    case "RETURNED":return {...base,action:"close",values:{evidenceChecked:true}};
    default:return null;
  }
}
