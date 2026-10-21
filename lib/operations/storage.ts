import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db";
import { applyCommand, type OperationsState, type Report, type Vessel } from "./model";

function toReport(row: Record<string, unknown>): Report {
  return {
    id: row.id as string,
    revision: row.revision as number,
    title: row.title as string,
    lat: row.lat as number,
    lon: row.lon as number,
    gear: row.gear as Report["gear"],
    notes: row.notes as string,
    photoDataUrl: (row.photo_data_url as string | null) ?? undefined,
    reportedAt: (row.reported_at as Date).toISOString(),
    stage: row.stage as Report["stage"],
    review: (row.review as Report["review"]) ?? undefined,
    assignment: (row.assignment as Report["assignment"]) ?? undefined,
    outcome: (row.outcome as Report["outcome"]) ?? undefined,
    compensation: (row.compensation as Report["compensation"]) ?? undefined,
    history: row.history as Report["history"],
  };
}

function toVessel(row: Record<string, unknown>): Vessel {
  return {
    id: row.id as string,
    name: row.name as string,
    lat: row.lat as number,
    lon: row.lon as number,
    maxDepth: row.max_depth as number,
    maxWave: row.max_wave as number,
    gear: row.gear as Vessel["gear"],
    speed: row.speed as number,
    hourlyCost: row.hourly_cost as number,
    available: row.available as boolean,
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export async function readOperations(): Promise<OperationsState> {
  const pool = getPool();
  const [reportRows, vesselRows] = await Promise.all([
    pool.query("SELECT * FROM reports ORDER BY reported_at DESC"),
    pool.query("SELECT * FROM vessels ORDER BY name ASC"),
  ]);
  return {
    schema: 1,
    reports: reportRows.rows.map(toReport),
    vessels: vesselRows.rows.map(toVessel),
  };
}

function j(value: unknown): string | null {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

async function insertReport(pool: ReturnType<typeof getPool>, r: Report) {
  await pool.query(
    `INSERT INTO reports (id, revision, title, lat, lon, gear, notes, photo_data_url, reported_at, stage, review, assignment, outcome, history)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [r.id, r.revision, r.title, r.lat, r.lon, r.gear, r.notes, r.photoDataUrl ?? null, r.reportedAt, r.stage, j(r.review), j(r.assignment), j(r.outcome), j(r.history)]
  );
}

async function updateReport(pool: ReturnType<typeof getPool>, r: Report) {
  await pool.query(
    `UPDATE reports SET revision=$2, stage=$3, review=$4, assignment=$5, outcome=$6, history=$7, compensation=$8 WHERE id=$1`,
    [r.id, r.revision, r.stage, j(r.review), j(r.assignment), j(r.outcome), j(r.history), j(r.compensation)]
  );
}

async function insertVessel(pool: ReturnType<typeof getPool>, v: Vessel) {
  await pool.query(
    `INSERT INTO vessels (id, name, lat, lon, max_depth, max_wave, gear, speed, hourly_cost, available, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [v.id, v.name, v.lat, v.lon, v.maxDepth, v.maxWave, v.gear, v.speed, v.hourlyCost, v.available, v.updatedAt]
  );
}

async function updateVessel(pool: ReturnType<typeof getPool>, v: Vessel) {
  await pool.query(`UPDATE vessels SET available=$2, updated_at=$3 WHERE id=$1`, [v.id, v.available, v.updatedAt]);
}

export async function writeCommand(command: unknown): Promise<OperationsState> {
  const pool = getPool();
  const now = new Date().toISOString();
  const cmd = command as { action?: string; id?: string };
  const before = await readOperations();
  const next = applyCommand(before, command, { now, id: `NB-${randomUUID()}` });

  if (cmd.action === "createReport") {
    await insertReport(pool, next.reports[0]);
  } else if (cmd.action === "createVessel") {
    await insertVessel(pool, next.vessels[next.vessels.length - 1]);
  } else if (cmd.action === "availability") {
    const v = next.vessels.find((v) => v.id === cmd.id);
    if (v) await updateVessel(pool, v);
  } else {
    const r = next.reports.find((r) => r.id === cmd.id);
    if (r) await updateReport(pool, r);
  }
  return next;
}
