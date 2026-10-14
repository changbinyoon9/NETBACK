import { NextRequest, NextResponse } from "next/server";
import { readOperations, writeCommand } from "@/lib/operations/storage";
import { WorkflowError } from "@/lib/operations/model";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireAdmin(request: NextRequest) {
  if (!verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value)) {
    throw new WorkflowError("Admin sign-in required.", 401);
  }
}

function failure(error: unknown) {
  if (error instanceof WorkflowError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("NETBACK storage error", error);
  return NextResponse.json({ error: "Records could not be read or saved. Existing data has not been replaced." }, { status: 500 });
}

// Reading the full queue (every report + the fleet) is an admin operation.
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    return NextResponse.json(await readOperations(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failure(e);
  }
}

// Creating a report is the public intake path (a fisherman reporting gear) —
// no admin session required. Every other action (review, assign, start,
// outcome, close, fleet management) mutates the live queue and requires one.
export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      throw new WorkflowError("JSON is required.", 415);
    }
    const body = await request.text();
    // 6MB cap: a createReport command can carry a compressed photo (~3MB of
    // decoded image, ~4MB once base64-inflated) alongside the usual fields.
    if (body.length > 6_000_000) throw new WorkflowError("Command too large.", 413);
    let command: unknown;
    try {
      command = JSON.parse(body);
    } catch {
      throw new WorkflowError("Invalid JSON.");
    }
    const action = (command as { action?: string })?.action;
    if (action !== "createReport") requireAdmin(request);
    return NextResponse.json(await writeCommand(command), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failure(e);
  }
}
