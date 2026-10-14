import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The live spatial-analysis engine reads data/gebco.tif, data/mpa_polygons.json
  // and data/vessel_track_points.json via runtime-joined fs paths, which Next's
  // automatic output file tracing can miss — include them explicitly so they
  // ship with the serverless function bundle.
  outputFileTracingIncludes: {
    "/api/analyze-report": ["./data/**"],
  },
};

export default nextConfig;
