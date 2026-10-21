import type { SVGProps } from "react";

type EngineIconKind = "gear" | "mpa" | "env" | "depth" | "final";

/** Small line icons for the engine-trace step nodes, replacing raw math-symbol glyphs. */
export function EngineStepIcon({ kind, ...props }: SVGProps<SVGSVGElement> & { kind: EngineIconKind }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {kind === "gear" && (
        // A fragment of net mesh — the gear-hazard evidence step.
        <path d="M4 7l5 5-5 5M9 3l5 5-5 5M14 7l5 5-5 5M9 13l5 5-5 5" />
      )}
      {kind === "mpa" && (
        // A location pin inside a dashed proximity ring.
        <>
          <circle cx="12" cy="12" r="9" strokeDasharray="2.6 3" />
          <path d="M12 7.5a3 3 0 0 1 3 3c0 2.2-3 5.5-3 5.5s-3-3.3-3-5.5a3 3 0 0 1 3-3Z" />
          <circle cx="12" cy="10.5" r=".9" fill="currentColor" stroke="none" />
        </>
      )}
      {kind === "env" && (
        // Two factors combining into one — the weighted environmental sum.
        <>
          <circle cx="8" cy="8" r="4.3" />
          <circle cx="15" cy="13" r="4.7" />
        </>
      )}
      {kind === "depth" && (
        // Stacked wave lines receding downward — depth below the surface.
        <path d="M3 6q4.5-2.6 9 0t9 0M4.5 12q4-2.2 7.5 0t7.5 0M6 18q3.2-1.8 6-0t6 0" />
      )}
      {kind === "final" && (
        // A simple pennant marking the resulting priority.
        <path d="M6 3v18M6 4h12l-3.5 4L18 12H6" />
      )}
    </svg>
  );
}
