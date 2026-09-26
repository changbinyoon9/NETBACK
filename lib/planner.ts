import type { Candidate, Job } from "./types";

export interface PlanSettings {
  budget: number; maxDepth: number; maxDistance: number; minTonnage: number;
  waveHeight: number; waveLimit: number; speedKnots: number; workHours: number;
  hourlyRate: number; fuelPrice: number; mobilization: number; maxHours: number;
  maxMissions: number; routeWeight: number; objective: "priority" | "value";
  region: string; assumeQualified: boolean;
}
export const DEFAULT_SETTINGS: PlanSettings = {
  budget: 10000000, maxDepth: 150, maxDistance: 5, minTonnage: 5,
  waveHeight: 0.8, waveLimit: 2, speedKnots: 8, workHours: 2,
  hourlyRate: 160000, fuelPrice: 1600, mobilization: 250000,
  maxHours: 8, maxMissions: 12, routeWeight: 0.7,
  objective: "priority", region: "All regions", assumeQualified: true,
};
export const LIMITS: Record<Exclude<keyof PlanSettings, "objective" | "region" | "assumeQualified">, [number, number]> = {
  budget:[0,100000000], maxDepth:[0,1500], maxDistance:[0,10], minTonnage:[0,100],
  waveHeight:[0,5], waveLimit:[0,5], speedKnots:[1,25], workHours:[0.5,12],
  hourlyRate:[0,1000000], fuelPrice:[0,5000], mobilization:[0,5000000],
  maxHours:[1,24], maxMissions:[0,100], routeWeight:[0,1],
};
export function normalizeSettings(input: PlanSettings): PlanSettings {
  const s = { ...DEFAULT_SETTINGS, ...input };
  for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    const [min,max] = LIMITS[key];
    s[key] = Number.isFinite(s[key]) ? Math.min(max,Math.max(min,s[key])) : DEFAULT_SETTINGS[key];
  }
  s.maxMissions = Math.floor(s.maxMissions);
  s.objective = s.objective === "value" ? "value" : "priority";
  return s;
}
export interface PairEstimate {
  candidate: Candidate; suitability: number; priority: number;
  travelHours: number; recoveryHours: number; hours: number;
  fuelLitres: number; fuelCost: number; labourCost: number; fixedCost: number; cost: number;
}
export interface PlanRow { job: Job; status: "Planned" | "Deferred"; reason: string; pair: PairEstimate | null; }
export interface PlanResult {
  settings: PlanSettings; rows: PlanRow[]; selected: PlanRow[]; totalCost: number;
  totalHours: number; priorityPoints: number; eligibleJobs: number; unusedBudget: number;
}
// A counterfactual planning model. Historical distance is only a detour proxy;
// qualification, availability and every cost input are explicit scenario assumptions.
export function estimatePair(job: Job, candidate: Candidate, s: PlanSettings): PairEstimate {
  const depth = job.bathymetricDepthM ?? 0;
  const suitability = s.routeWeight*Math.exp(-candidate.distanceKm/5)+(1-s.routeWeight)*(1-Math.exp(-candidate.vesselTonnage/10));
  const priority = (job.environmentalPriorityScore ?? 0)*Math.exp(-depth/200)*suitability;
  const weatherFactor = 1+0.25*s.waveHeight;
  const travelHours = 2*candidate.distanceKm/(s.speedKnots*1.852)*weatherFactor;
  const recoveryHours = s.workHours*(1+depth/200)*weatherFactor;
  const hours = travelHours+recoveryHours;
  const fuelLitres = (8+1.5*candidate.vesselTonnage)*(travelHours+0.4*recoveryHours);
  const fuelCost = Math.round(fuelLitres*s.fuelPrice);
  const labourCost = Math.round(hours*s.hourlyRate);
  const fixedCost = Math.round(s.mobilization);
  return { candidate,suitability,priority,travelHours,recoveryHours,hours,fuelLitres,fuelCost,labourCost,fixedCost,cost:fuelCost+labourCost+fixedCost };
}
export function buildPlan(jobs: Job[], candidates: Candidate[], input: PlanSettings, unavailable: string[] = []): PlanResult {
  const s=normalizeSettings(input); const excluded=new Set(unavailable);
  const byJob=new Map<string,Candidate[]>();
  for (const c of candidates) {
    if (!Number.isFinite(c.distanceKm)||c.distanceKm<0||!Number.isFinite(c.vesselTonnage)||c.vesselTonnage<0) continue;
    const list=byJob.get(c.jobId)??[]; list.push(c); byJob.set(c.jobId,list);
  }
  const choices=new Map<string,PairEstimate[]>(); const rows:PlanRow[]=[];
  for(const job of jobs.filter(j=>s.region==="All regions"||j.region===s.region)) {
    let reason="";
    if(!s.assumeQualified) reason="Qualification not assumed";
    else if(s.waveHeight>s.waveLimit) reason="Weather hold";
    else if(job.environmentalPriorityScore===null||!Number.isFinite(job.environmentalPriorityScore)) reason="Insufficient evidence";
    else if(job.bathymetricDepthM===null||!Number.isFinite(job.bathymetricDepthM)||job.bathymetricDepthM<0) reason="Depth unavailable";
    else if(job.bathymetricDepthM>s.maxDepth) reason="Beyond depth limit";
    let pairs:PairEstimate[]=[];
    if(!reason) {
      const pool=(byJob.get(job.jobId)??[]).filter(c=>c.distanceKm<=s.maxDistance&&c.vesselTonnage>=s.minTonnage&&!excluded.has(c.vesselId));
      pairs=pool.map(c=>estimatePair(job,c,s)).filter(p=>p.hours<=s.maxHours);
      if(!pool.length) reason="No eligible vessel";
      else if(!pairs.length) reason="Beyond time window";
    }
    choices.set(job.jobId,pairs);
    rows.push({job,status:"Deferred",reason,pair:null});
  }
  const eligibleJobs=rows.filter(r=>!r.reason).length;
  const assigned=new Set<string>(); let totalCost=0;
  const selected:PlanRow[]=[];
  const merit=(p:PairEstimate)=>s.objective==="value"?p.priority/Math.max(1,p.cost):p.priority;
  // Greedy allocation, never a claim of globally optimal routing. One vessel/job per window.
  while(selected.length<s.maxMissions) {
    let best:{row:PlanRow;pair:PairEstimate}|null=null;
    for(const row of rows) {
      if(row.status==="Planned"||row.reason) continue;
      for(const pair of choices.get(row.job.jobId)??[]) {
        if(assigned.has(pair.candidate.vesselId)||totalCost+pair.cost>s.budget) continue;
        if(!best||merit(pair)>merit(best.pair)) best={row,pair};
      }
    }
    if(!best) break;
    best.row.status="Planned"; best.row.reason="Within scenario limits"; best.row.pair=best.pair;
    assigned.add(best.pair.candidate.vesselId);totalCost+=best.pair.cost;selected.push(best.row);
  }
  for(const row of rows) if(!row.reason) {
    const available=(choices.get(row.job.jobId)??[]).filter(p=>!assigned.has(p.candidate.vesselId));
    row.reason=selected.length>=s.maxMissions?"Mission limit reached":!available.length?"Vessel already allocated":"Remaining budget too low";
    row.pair=[...available].sort((a,b)=>merit(b)-merit(a))[0]??null;
  }
  return {settings:s,rows,selected,totalCost,totalHours:selected.reduce((a,r)=>a+(r.pair?.hours??0),0),priorityPoints:selected.reduce((a,r)=>a+(r.pair?.priority??0),0),eligibleJobs,unusedBudget:s.budget-totalCost};
}
export function planCsv(plan:PlanResult,unavailable:string[]):string {
  const escape=(v:unknown)=>`"${String(v??"").replaceAll('"','""')}"`;
  const rows:unknown[][]=[
    ["NETBACK counterfactual plan","Historical data; not a dispatch instruction"],
    ["model","planner-v1; greedy; one vessel per mission per window"],
    ["distance","2 × historical nearest-track distance; not a navigable route"],
    ["fuel","(8 + 1.5 × tonnage) × (travel hours + 0.4 × work hours); assumed"],
    ["excluded vessels",unavailable.join(";")],
    ...Object.entries(plan.settings).map(([k,v])=>["assumption",k,v]),[],
    ["job_id","status","reason","vessel_id","priority_index","estimated_KRW","travel_hours","recovery_hours","fuel_KRW","crew_KRW","fixed_KRW"]
  ];
  for(const r of plan.rows) rows.push([r.job.jobId,r.status,r.reason,r.pair?.candidate.vesselId,r.pair?.priority,r.pair?.cost,r.pair?.travelHours,r.pair?.recoveryHours,r.pair?.fuelCost,r.pair?.labourCost,r.pair?.fixedCost]);
  return "\uFEFF"+rows.map(r=>r.map(escape).join(",")).join("\r\n");
}
