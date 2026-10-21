"use client";

import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Brand } from "@/components/Brand";
import { FieldStory } from "@/components/home/FieldStory";
import { ServiceAccess } from "@/components/ServiceAccess";
import { HeroMap } from "@/components/HeroMap";
import { FishingNet, GearIcon, RecoveryRoute } from "@/components/GearArt";
import { useT } from "@/lib/i18n/LocaleProvider";
import kpi from "@/public/data/kpi.json";

function Lines({ text }: { text: string }) {
  const parts = text.split("\n");
  return (
    <>
      {parts.map((line, i) => (
        <span key={i}>
          {line}
          {i < parts.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

export default function Home() {
  const t = useT();

  const steps = [
    { number: "01", kind: "buoy" as const, title: t("home.step1.title"), verb: t("home.step1.verb"), body: t("home.step1.body") },
    { number: "02", kind: "vessel" as const, title: t("home.step2.title"), verb: t("home.step2.verb"), body: t("home.step2.body") },
    { number: "03", kind: "net" as const, title: t("home.step3.title"), verb: t("home.step3.verb"), body: t("home.step3.body") },
  ];

  return (
    <div className="netback-site">
      <Nav />
      <main id="main-content" className="home-v2">
        <section className="dock-hero">
          <div className="dock-copy">
            <p className="dock-kicker">
              <span className="kicker-line" /> {t("home.kicker").toUpperCase()}
            </p>
            <h1>
              {t("home.title.line1")}
              <br />
              {t("home.title.line2")}
              <br />
              <span className="back-word">
                {t("home.title.line3")}
                <svg viewBox="0 0 560 24" aria-hidden="true">
                  <path
                    d="M5 16C180-3 350 5 553 10M147 22c136-11 267-10 365-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p className="dock-intro">
              {t("home.intro.line1")}
              <br />
              {t("home.intro.line2")}
            </p>
            <div className="dock-actions">
              <Link href="/report" className="dock-button">
                {t("home.cta.lab")} <span aria-hidden="true">↗</span>
              </Link>
              <Link href="#the-connection" className="dock-text-link">
                {t("home.cta.thread")} <span aria-hidden="true">↓</span>
              </Link>
            </div>
            <div className="dock-coordinate">
              <span>{t("home.coordinate").toUpperCase()}</span>
              <GearIcon kind="knot" width="28" height="28" />
            </div>
          </div>
          <div className="dock-scene">
            <div className="scene-grid" />
            <div className="sea-photo">
              <video autoPlay muted loop playsInline poster="/videos/story/poster.jpg" aria-hidden="true">
                <source src="/videos/story/arc-saver-dive.mp4" type="video/mp4" />
              </video>
            </div>
            <FishingNet />
            <div className="gear-tag">
              <span className="tag-hole" />
              <span>
                {t("home.tag.lost").toUpperCase()}
                <br />
                <strong>{t("home.tag.found").toUpperCase()}</strong>
              </span>
              <GearIcon kind="buoy" width="40" height="48" />
            </div>
            <div className="recovery-seal">
              <span>{t("home.seal.less").toUpperCase()}</span>
              <GearIcon kind="net" width="57" height="57" />
              <span>{t("home.seal.more").toUpperCase()}</span>
            </div>
            <p className="scene-note">
              {t("home.note.line1")}
              <br />
              <span>{t("home.note.line2")}</span>
              <svg viewBox="0 0 100 50" aria-hidden="true">
                <path d="M4 5q50 45 85 15m-10-2 14-1-5 12" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </p>
            <span className="scene-credit">{t("home.credit").toUpperCase()}</span>
          </div>
        </section>

        <ServiceAccess />
        <div className="rope-divider" aria-hidden="true">
          <span>{t("home.rope.find").toUpperCase()}</span>
          <GearIcon kind="buoy" />
          <span>{t("home.rope.connect").toUpperCase()}</span>
          <GearIcon kind="knot" />
          <span>{t("home.rope.bring").toUpperCase()}</span>
          <GearIcon kind="net" />
          <span>{t("home.rope.keep").toUpperCase()}</span>
        </div>

        <section className="connection-section" id="the-connection">
          <div className="connection-intro">
            <p className="dock-kicker">{t("home.s1.kicker").toUpperCase()}</p>
            <h2>
              {t("home.s1.title.line1")}
              <br />
              <span>{t("home.s1.title.line2")}</span>
            </h2>
            <p>
              <Lines text={`${t("home.s1.body.line1")}\n${t("home.s1.body.line2")}\n${t("home.s1.body.line3")}`} />
            </p>
          </div>
          <div className="gear-steps">
            <RecoveryRoute />
            {steps.map((step) => (
              <article className={`gear-step gear-step-${step.kind}`} key={step.number}>
                <div className="gear-drawing">
                  <span className="drawing-index">{step.number}</span>
                  <GearIcon kind={step.kind} />
                  <span className="drawing-caption">{step.verb.toUpperCase()}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <FieldStory />
        <section className="fieldbook-section">
          <div className="fieldbook-copy">
            <p className="dock-kicker">{t("home.s2.kicker").toUpperCase()}</p>
            <h2>
              {t("home.s2.title.line1")}
              <br />
              {t("home.s2.title.line2")}
              <br />
              <span className="outlined-word">{t("home.s2.title.line3")}</span>
            </h2>
            <p>{t("home.s2.body")}</p>
            <Link href="/lab/planner" className="dock-button">
              {t("home.s2.cta")} <span aria-hidden="true">↗</span>
            </Link>
            <div className="fieldbook-disclaimer">
              <GearIcon kind="buoy" width="30" height="36" />
              <p>
                <Lines text={t("home.s2.disclaimer")} />
              </p>
            </div>
          </div>
          <div className="fieldbook-map">
            <div className="map-tape">{t("home.map.tape").toUpperCase()}</div>
            <div className="fieldbook-map-title">
              <span>{t("home.map.title")}</span>
              <span>{t("home.map.no").toUpperCase()}</span>
            </div>
            <HeroMap />
            <div className="fieldbook-stats">
              <div>
                <strong>{kpi.recoveryJobs}</strong>
                <span>{t("home.map.records")}</span>
              </div>
              <div>
                <strong>{kpi.uniqueCandidateVessels.toLocaleString("en-US")}</strong>
                <span>{t("home.map.vessels")}</span>
              </div>
              <div>
                <strong>{kpi.candidateVesselMatches.toLocaleString("en-US")}</strong>
                <span>{t("home.map.links")}</span>
              </div>
            </div>
            <p className="fieldbook-caption">{t("home.map.caption")}</p>
          </div>
        </section>

        <section className="all-hands-section">
          <GearIcon kind="knot" className="all-hands-knot" />
          <div>
            <p className="dock-kicker">{t("home.s3.kicker").toUpperCase()}</p>
            <h2>
              {t("home.s3.title.line1")}
              <br />
              {t("home.s3.title.line2")} <span>{t("home.s3.title.line3")}</span>
            </h2>
            <div className="all-hands-actions">
              <Link href="/report" className="dock-button">
                {t("home.s3.cta1")} <span aria-hidden="true">↗</span>
              </Link>
              <Link href="/how-it-works" className="dock-text-link">
                {t("home.s3.cta2")}
              </Link>
            </div>
          </div>
          <div className="small-stamp">
            <GearIcon kind="vessel" />
            <span>
              {t("home.stamp.line1").toUpperCase()}
              <br />
              {t("home.stamp.line2").toUpperCase()}
            </span>
          </div>
        </section>
      </main>
      <footer className="dock-footer">
        <div className="footer-top">
          <Brand />
          <p>
            <Lines text={t("home.footer.tagline")} />
          </p>
          <Link href="/report/status">{t("home.footer.explore")} ↗</Link>
        </div>
        <div className="footer-wordmark" aria-hidden="true">
          NETBACK<span>↗</span>
        </div>
        <div className="footer-bottom">
          <span>{t("home.footer.strapline").toUpperCase()}</span>
          <span>{t("home.footer.sub").toUpperCase()}</span>
        </div>
      </footer>
    </div>
  );
}
