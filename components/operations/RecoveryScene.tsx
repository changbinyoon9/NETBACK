import { STAGES, type Report } from "@/lib/operations/model";
import { useT, useTf } from "@/lib/i18n/LocaleProvider";
export const STEP_KEYS = ["scene.step.signal", "scene.step.reviewed", "scene.step.matched", "scene.step.underway", "scene.step.returned", "scene.step.closed"];
export function RecoveryScene({ report, test, playing }: { report?: Report; test: boolean; playing: boolean }) {
  const t = useT(); const tf = useTf();
  const step = report ? STAGES.indexOf(report.stage) : -1;
  const landed = step >= 4 && report?.outcome?.result !== "Failed";
  const stepLabel = report ? t(STEP_KEYS[step]) : "";
  return <div className={`recovery-sea ${playing ? "sea-playing" : ""}`}>
    <div className="sea-caption"><span>{test ? t("scene.caption.training") : t("scene.caption.field")}</span><span>{t("scene.caption.schematic")}</span></div>
    <svg viewBox="0 0 900 440" role="img" aria-label={report ? tf("scene.aria.diagram", { stage: stepLabel, landedText: landed ? t("scene.aria.landed") : t("scene.aria.underwater") }) : t("scene.aria.empty")}>
      <defs><pattern id="studio-net" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M0 11L11 0 22 11 11 22Z" fill="none" stroke="#ecddad" strokeWidth="1.3"/></pattern><pattern id="studio-grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="#315c53" strokeWidth=".5"/></pattern></defs>
      <path d="M0 160Q110 145 225 163T450 160T675 162T900 155V440H0Z" fill="#214e45"/>
      <path d="M0 180H900V440H0Z" fill="url(#studio-grid)"/>
      <path className="sea-wave" d="M0 163q56-12 112 0t112 0t112 0t112 0t112 0t112 0t112 0t112 0" fill="none" stroke="#86afa0" strokeWidth="2"/>
      <path d="M0 390Q100 365 175 400T355 385T550 400T730 365T900 389V440H0Z" fill="#183f37"/>
      <g fill="none" stroke="#8bafa0" strokeWidth="1.5" opacity=".65"><path d="M45 401q-20-48 0-73m0 56q25-26 20-42M788 395q30-53 11-92m-5 61q-22-30-10-48M845 400v-49m0 26q-25-18-19-38"/></g>
      <g fill="#173d35"><path d="M0 147H175V165H0Z"/><path d="M28 156h9v93h-9M133 156h9v93h-9"/><path d="M28 145V78h92v67M20 78l54-35 55 35" fill="#bfd2c4" stroke="#173d35" strokeWidth="2"/><path d="M45 94h17v23H45M87 94h17v23H87"/><text x="43" y="137" fontSize="9" letterSpacing="2" fill="#173d35">{t("scene.label.harbor")}</text></g>
      <path d="M187 116C300 65 458 90 586 137" fill="none" stroke="#748f7d" strokeDasharray="4 7"/>
      <g style={{ transform: `translate(${step < 3 ? 180 : step < 4 ? 470 : 180}px, 84px)`, transition: "transform 1.8s ease-in-out" }}>
        <path d="M0 55h115L96 80H24Z" fill="#e86f45" stroke="#173d35" strokeWidth="2"/><path d="M26 54V22h38v32M65 53V8l36 13v32" fill="#f6f3e8" stroke="#173d35" strokeWidth="2"/><path d="M34 30h20v12H34" fill="#89ada1"/><path d="M66 8V-14M67-10h-16M101 22v26" fill="none" stroke="#173d35" strokeWidth="2"/><circle cx="23" cy="66" r="4" fill="#173d35"/><text x="69" y="68" fontSize="9" fill="#173d35">NB</text>
      </g>
      {report && <><g transform="translate(620 139)"><path d="M0 26V-40l23 8-23 9" fill="#e86f45" stroke="#f6f3e8" strokeWidth="2"/><path d="M-12 23h24l8 20h-40Z" fill="#e86f45"/><path d="M0 44v90" stroke="#dfd0a7" strokeDasharray="4 5"/></g>
        <g style={{transform: landed ? "translate(130px, 98px) scale(.55)" : "translate(552px, 275px)", transition:"transform 1.8s ease-in-out"}}><path d="M0 0Q60 20 124 0L102 78Q62 112 20 77Z" fill="url(#studio-net)" stroke="#ecd9a6" strokeWidth="2"/>{[0,30,62,94,124].map((x)=><rect key={x} x={x-5} y={x===0||x===124?-5:4} width="10" height="16" rx="5" fill="#e86f45"/>)}</g>
        <text x="640" y="219" fill="#d5e4d8" fontSize="11" letterSpacing="2">{t("scene.label.reportedGear")}</text><text x="640" y="239" fill="#91b7a5" fontSize="11">{report.lat.toFixed(4)}° N</text>
      </>}
      <g fill="none" stroke="#789f8d" opacity=".6"><path d="M307 292q20-15 40 0-20 15-40 0l-10-8v16ZM375 325q14-11 28 0-14 11-28 0l-8-6v12Z"/></g>
      <text x="28" y="420" fill="#9abbac" fontSize="10" letterSpacing="3">{t("scene.label.tagline")}</text>
    </svg>
    <div className="sea-status"><span className="sea-dot"/><span>{report ? stepLabel : t("scene.status.empty")}</span><small>{test ? t("scene.status.training") : t("scene.status.operator")}</small></div>
  </div>;
}
