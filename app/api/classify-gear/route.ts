import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 15;

// Community-trained object detector (Roboflow Universe, "fishing-net-detection"
// by polarizationdaolucolor, CC BY 4.0) — real underwater/dockside photos, not
// sonar. The dataset's 13 classes include rope and trap labels, but the
// published Validation Set and Test Set metrics only report a measured
// mAP50 for the "fishing-net" class (33%) and an overall blended score —
// rope/trap classes have no evaluated per-class accuracy at all, which in
// practice means they essentially never fire a trustworthy detection.
// Scoping the suggestion to NET only, rather than letting a technically-
// present-but-unevaluated class produce an unfounded TRAP/ROPE suggestion.
const MODEL_URL = "https://serverless.roboflow.com/fishing-net-detection/2";

// Below this, the top class is usually noise (e.g. the model once called our
// own knot-shaped logo a 96%-confidence "fishing net" on an unrelated test —
// a believable-looking score is not the same as a believable detection, so
// this is a floor on when the suggestion is worth surfacing at all, not a
// claim that everything above it is reliable).
const MIN_SUGGESTION_CONFIDENCE = 0.5;

const CLASS_TO_GEAR: Record<string, "NET"> = {
  "fish net": "NET",
  "fishing net": "NET",
  "fishing-net": "NET",
};

interface RoboflowPrediction {
  class: string;
  confidence: number;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ROBOFLOW_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEAR_CLASSIFIER_UNAVAILABLE", message: "Gear classifier is not configured." }, { status: 503 });
  }

  let body: { photoDataUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_INPUT", message: "Invalid JSON body." }, { status: 400 });
  }
  const dataUrl = body.photoDataUrl;
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "BAD_INPUT", message: "photoDataUrl must be an image data URL." }, { status: 400 });
  }
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);

  let response: Response;
  try {
    response = await fetch(MODEL_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: base64,
    });
  } catch (e) {
    return NextResponse.json({ error: "CLASSIFIER_UNREACHABLE", message: "Could not reach the gear classifier.", detail: String(e) }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: "CLASSIFIER_FAILED", message: "The gear classifier returned an error.", detail: await response.text() },
      { status: 502 }
    );
  }

  const data = (await response.json()) as { predictions?: RoboflowPrediction[] };
  const predictions = data.predictions ?? [];

  // Pick the highest-confidence prediction that maps to a class we trust
  // (currently NET only — see MODEL_URL comment above for why).
  let best: { gear: "NET"; confidence: number } | null = null;
  for (const p of predictions) {
    const gear = CLASS_TO_GEAR[p.class];
    if (gear && (!best || p.confidence > best.confidence)) {
      best = { gear, confidence: p.confidence };
    }
  }

  const suggestion = best && best.confidence >= MIN_SUGGESTION_CONFIDENCE ? best : null;

  return NextResponse.json({
    suggestion: suggestion ? { gear: suggestion.gear, confidence: Math.round(suggestion.confidence * 1000) / 1000 } : null,
    detections: predictions.map((p) => ({ class: p.class, confidence: Math.round(p.confidence * 1000) / 1000 })),
  });
}
