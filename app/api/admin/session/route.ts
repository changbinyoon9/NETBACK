import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authed = verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value);
  return NextResponse.json({ authed });
}
