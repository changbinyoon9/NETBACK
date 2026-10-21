"use client";

import dynamic from "next/dynamic";

export const GisHeatmapLoader = dynamic(() => import("./GisHeatmap").then((m) => m.GisHeatmap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-xl border border-border bg-slate-50 text-sm text-slate-400">
      Loading map…
    </div>
  ),
});
