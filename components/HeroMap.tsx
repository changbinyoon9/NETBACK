"use client";

import { useJobs } from "@/lib/data";
import { MapViewLoader } from "./MapViewLoader";
import type { JobPin } from "./MapView";

export function HeroMap() {
  const { data: jobs } = useJobs();
  const pins: JobPin[] = (jobs ?? [])
    .filter((j) => j.finalPriorityClass !== "NOT_SCORED")
    .map((j) => ({
      jobId: j.jobId,
      lat: j.lat,
      lon: j.lon,
      finalPriorityClass: j.finalPriorityClass,
      materialRaw: j.materialRaw,
    }));

  return (
    <MapViewLoader
      center={[36.3, 128.6]}
      zoom={6}
      jobPins={pins}
      heightClass="h-[280px] sm:h-[360px] lg:h-[440px]"
    />
  );
}
