import { NextResponse } from "next/server";
import { readOperations } from "@/lib/operations/storage";
import { analyzeLive } from "@/lib/liveEngine/analyze";
import { isFieldRecovery, type Gear } from "@/lib/operations/model";
import type { LiveGearClass } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// NETBACK's operational gear vocabulary (NET/TRAP/ROPE/OTHER, used by the
// report/operations workflow) is coarser than the live engine's hazard-prior
// classes (which mirror the Norwegian catch-observation evidence table).
// TRAP and ROPE have no dedicated hazard-prior entry, so both fall back to
// the general-gear baseline rather than being misrepresented as net-specific.
const GEAR_TO_LIVE_CLASS: Record<Gear, LiveGearClass> = {
  NET: "FISHING_NET",
  TRAP: "FISHING_GEAR",
  ROPE: "FISHING_GEAR",
  OTHER: "GEAR_COMPONENT",
};

export async function GET() {
  const state = await readOperations();
  const recovered = state.reports.filter(isFieldRecovery);

  const points: {
    lat: number; lon: number; gear: Gear; weightKg: number;
    environmentalPriorityScore: number | null; insideMpa: boolean;
  }[] = [];

  let successfulWeightKg = 0;
  let compensationPaidKrw = 0;
  let compensationPendingKrw = 0;
  let envSum = 0;
  let envCount = 0;
  let nearMpaCount = 0;
  let spatialCount = 0;
  const byGear = new Map<Gear, { count: number; weightKg: number }>();

  for (const r of recovered) {
    const weight = r.outcome!.weight;
    successfulWeightKg += weight;
    const bucket = byGear.get(r.gear) ?? { count: 0, weightKg: 0 };
    bucket.count += 1; bucket.weightKg += weight;
    byGear.set(r.gear, bucket);

    if (r.compensation) {
      if (r.compensation.status === "PAID") compensationPaidKrw += r.compensation.amountKrw;
      else compensationPendingKrw += r.compensation.amountKrw;
    }

    let environmentalPriorityScore: number | null = null;
    let insideMpa = false;
    try {
      const result = await analyzeLive(r.lat, r.lon, GEAR_TO_LIVE_CLASS[r.gear], "en");
      if (!("error" in result)) {
        spatialCount++;
        environmentalPriorityScore = result.environmental.environmentalPriority;
        insideMpa = result.environmental.insideMpa || result.environmental.mpaDistanceKm <= 5;
        if (environmentalPriorityScore !== null) { envSum += environmentalPriorityScore; envCount += 1; }
        if (insideMpa) nearMpaCount += 1;
      }
    } catch {
      // Keep the point in the dataset even if the engine can't score it.
    }

    points.push({ lat: r.lat, lon: r.lon, gear: r.gear, weightKg: weight, environmentalPriorityScore, insideMpa });
  }

  return NextResponse.json({
    totals: {
      recoveries: recovered.length,
      successfulWeightKg,
      compensationPaidKrw,
      compensationPendingKrw,
    },
    byGear: Array.from(byGear.entries()).map(([gear, v]) => ({ gear, ...v })),
    avgEnvironmentalPriority: envCount ? envSum / envCount : null,
    pctNearMpa: spatialCount ? (nearMpaCount / spatialCount) * 100 : null,
    points,
  });
}
