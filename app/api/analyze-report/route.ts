import { NextRequest, NextResponse } from "next/server";
import { analyzeLive } from "@/lib/liveEngine/analyze";

export const runtime = "nodejs";
export const maxDuration = 30;

type Locale = "en" | "ko";

const MESSAGES: Record<Locale, Record<string, string>> = {
  en: {
    invalidJson: "Invalid JSON body.",
    provideCoordinate: "Provide a coordinate object.",
    latLonRequired: "lat and lon are required numbers.",
    outsideCoverage: "Choose a location in the Korean study area (32–40° N, 124–133° E).",
    unsupportedGear: "Unsupported gear class.",
    engineFailed: "The spatial analysis engine failed.",
  },
  ko: {
    invalidJson: "잘못된 JSON 본문입니다.",
    provideCoordinate: "좌표 객체를 전달해 주세요.",
    latLonRequired: "lat와 lon은 필수 숫자 값입니다.",
    outsideCoverage: "한국 연구 해역(북위 32–40°, 동경 124–133°) 내의 위치를 선택하세요.",
    unsupportedGear: "지원하지 않는 어구 유형입니다.",
    engineFailed: "공간 분석 엔진 실행에 실패했습니다.",
  },
};

export async function POST(request: NextRequest) {
  let body: { lat?: number; lon?: number; gearClass?: string; locale?: string };
  let locale: Locale = "en";
  try {
    body = await request.json();
    if (body && typeof body === "object" && body.locale === "ko") locale = "ko";
  } catch {
    return NextResponse.json({ error: "BAD_INPUT", message: MESSAGES.en.invalidJson }, { status: 400 });
  }
  const m = MESSAGES[locale];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "BAD_INPUT", message: m.provideCoordinate }, { status: 400 });
  }
  const { lat, lon, gearClass } = body;
  if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "BAD_INPUT", message: m.latLonRequired }, { status: 400 });
  }
  if (lat < 32 || lat > 40 || lon < 124 || lon > 133) {
    return NextResponse.json({ error: "OUTSIDE_COVERAGE", message: m.outsideCoverage }, { status: 422 });
  }
  if (gearClass !== undefined && !["FISHING_NET", "FISHING_GEAR", "GEAR_COMPONENT", "UNKNOWN"].includes(gearClass)) {
    return NextResponse.json({ error: "BAD_INPUT", message: m.unsupportedGear }, { status: 400 });
  }

  try {
    const result = await analyzeLive(lat, lon, gearClass ?? "UNKNOWN", locale);
    if ("error" in result) {
      return NextResponse.json(result, { status: 422 });
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: "ANALYSIS_FAILED", message: m.engineFailed, detail: String(e) },
      { status: 502 }
    );
  }
}
