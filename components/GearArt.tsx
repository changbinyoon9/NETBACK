import type { SVGProps } from "react";

type GearKind = "net" | "buoy" | "vessel" | "knot";

/** Original NETBACK line drawings; deliberately share the same rope stroke. */
export function GearIcon({ kind, ...props }: SVGProps<SVGSVGElement> & { kind: GearKind }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {kind === "buoy" && <>
        <path d="M51 13v16M51 13l19 6-19 6" />
        <path d="M43 30h16l9 26H33z" fill="var(--signal, #e66c43)" stroke="none" />
        <path d="M43 30h16l9 26H33zM33 56l5 13h25l5-13M40 42h22M50 70v12" />
        <path d="M14 74q9-8 18 0t18 0t18 0t18 0M20 86q9-7 18 0t18 0t18 0" />
        <path d="M20 25l7 5M78 31l7-5M33 14l4 7" strokeWidth="1.5" />
      </>}
      {kind === "net" && <>
        <path d="M19 21q31 15 63-4M20 23l9 52q25 17 44-2l9-53" />
        <path d="M28 27l47 44M42 30l35 29M59 27l20 18M23 43l36 38M26 59l17 23M73 25L29 67M55 31L26 51M79 35L35 79M77 53L51 83" strokeWidth="1.4" />
        <path d="M14 17q7 2 11 5M31 23l8 2M48 25h8M66 22l8-2M80 16l7-3" stroke="var(--signal, #e66c43)" strokeWidth="7" />
        <path d="M29 77l-3 10M49 84v9M72 75l5 10" />
        <circle cx="26" cy="89" r="2.4" fill="currentColor"/><circle cx="49" cy="94" r="2.4" fill="currentColor"/><circle cx="78" cy="87" r="2.4" fill="currentColor"/>
      </>}
      {kind === "vessel" && <>
        <path d="M14 57h73L74 73H31z" fill="var(--signal, #e66c43)" stroke="none" />
        <path d="M14 57h73L74 73H31zM33 55V36h25v20M37 45h8M50 45h4M59 55V28l23 9v17M60 29V14M59 18h-9" />
        <path d="M75 37v11q-4 7 0 10M10 82q10-7 20 0t20 0t20 0t20 0M27 92q10-7 20 0t20 0" />
        <circle cx="28" cy="63" r="2" fill="currentColor"/><path d="M19 33q0-7 7-7" strokeWidth="1.5"/>
      </>}
      {kind === "knot" && <>
        <path d="M13 29l47 48c11 11 28-6 17-17L38 21C27 10 10 27 21 38l42 42M87 25L39 73c-12 12-29-5-17-17l38-38c12-12 29 5 17 17L34 78" strokeWidth="7" />
        <path d="M13 29l47 48c11 11 28-6 17-17L38 21C27 10 10 27 21 38l42 42M87 25L39 73c-12 12-29-5-17-17l38-38c12-12 29 5 17 17L34 78" stroke="var(--paper-rope,#f6f3e8)" strokeWidth="2" />
      </>}
    </svg>
  );
}

export function FishingNet() {
  return (
    <svg className="fishing-net-art" viewBox="0 0 640 660" fill="none" aria-hidden="true">
      <defs>
        <pattern id="hero-net-mesh" width="42" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
          <path d="M0 24L21 0l21 24-21 24z" stroke="#f4ebcc" strokeWidth="1.3" />
          <circle cx="0" cy="24" r="2.2" fill="#f4ebcc"/><circle cx="21" cy="0" r="2.2" fill="#f4ebcc"/>
        </pattern>
      </defs>
      <g className="net-sway">
        <path d="M173-25C197 89 367 109 613 35L636 314C580 383 498 474 395 470C283 466 268 339 219 237Z" fill="url(#hero-net-mesh)" opacity=".72" />
        <path d="M173-25C197 89 367 109 613 35M219 237C268 339 283 466 395 470C498 474 580 383 636 314" stroke="#f4ebcc" strokeWidth="3.5" />
        <path d="M183 5C215 96 376 110 617 43" stroke="#153e36" strokeWidth="1.5" strokeDasharray="4 5" />
        {[{x:230,y:61,r:22},{x:320,y:79,r:7},{x:415,y:76,r:-7},{x:508,y:61,r:-12},{x:598,y:38,r:-18}].map(p=>(
          <g key={p.x} transform={`translate(${p.x} ${p.y}) rotate(${p.r})`}>
            <rect x="-13" y="-20" width="26" height="40" rx="12" fill="#e66c43" stroke="#193f38" strokeWidth="2"/>
            <path d="M-12-2h24M-12 3h24" stroke="#ffe3b8" strokeWidth="3"/>
          </g>
        ))}
        <path d="M395 470q-22 57 10 65t16-16q-10-10-16 5M548 414l16 30" stroke="#f4ebcc" strokeWidth="3"/>
        <ellipse cx="565" cy="448" rx="6" ry="11" fill="#b5bab0" transform="rotate(-24 565 448)" />
      </g>
    </svg>
  );
}

export function RecoveryRoute() {
  return <svg className="recovery-route" viewBox="0 0 1200 150" fill="none" aria-hidden="true"><path d="M0 80C120-20 250 170 405 64S680 28 791 76s205 74 409-60" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 8"/><circle cx="405" cy="64" r="7" fill="var(--signal)"/><circle cx="791" cy="76" r="7" fill="var(--signal)"/></svg>;
}
