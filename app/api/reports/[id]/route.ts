import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, read-only lookup for the person who filed a report — a status
// check, not the admin queue. Returns only this one report, and leaves out
// assignment cost/vessel internals that belong to fleet operations.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT id, title, lat, lon, gear, stage, reported_at, history, photo_data_url FROM reports WHERE id = $1",
    [id]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "No report found with that ID." }, { status: 404 });
  }
  const r = rows[0];
  return NextResponse.json(
    {
      id: r.id,
      title: r.title,
      lat: r.lat,
      lon: r.lon,
      gear: r.gear,
      stage: r.stage,
      reportedAt: r.reported_at,
      history: r.history,
      photoDataUrl: r.photo_data_url ?? null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
