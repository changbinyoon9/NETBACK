import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getPool } from "@/lib/db";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Every report photo plus the gear type a human ultimately confirmed is a
// free labeled training example for re-training the gear classifier — this
// bundles them into class folders (Roboflow's classification-project upload
// format accepts a folder per label directly) so the data is one drag-and-
// drop away from strengthening the model on real NETBACK submissions instead
// of the community dataset's off-domain photos.
export async function GET(request: NextRequest) {
  if (!verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT id, gear, stage, reported_at, photo_data_url FROM reports WHERE photo_data_url IS NOT NULL ORDER BY reported_at ASC"
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "No reports with photos yet." }, { status: 404 });
  }

  const zip = new JSZip();
  const manifest: { id: string; gear: string; stage: string; reportedAt: string; file: string }[] = [];

  for (const r of rows as { id: string; gear: string; stage: string; reported_at: Date; photo_data_url: string }[]) {
    const match = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(r.photo_data_url);
    if (!match) continue;
    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const bytes = Buffer.from(match[2], "base64");
    const fileName = `${r.gear}/${r.id}.${ext}`;
    zip.file(fileName, bytes);
    manifest.push({ id: r.id, gear: r.gear, stage: r.stage, reportedAt: r.reported_at.toISOString(), file: fileName });
  }
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const buffer = await zip.generateAsync({ type: "uint8array" });
  // Node's Uint8Array buffer is typed ArrayBufferLike (never actually a
  // SharedArrayBuffer here), which is stricter than Blob's BlobPart type.
  return new NextResponse(new Blob([buffer as unknown as BlobPart]), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="netback-gear-photos-${new Date().toISOString().slice(0, 10)}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
