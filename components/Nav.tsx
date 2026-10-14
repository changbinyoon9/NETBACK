"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brand } from "./Brand";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { locale, toggleLocale, t } = useLocale();

  const LINKS = [
    { href: "/", label: t("nav.mission") },
    { href: "/report", label: t("nav.report") },
    { href: "/lab", label: t("nav.lab") },
    { href: "/simulate", label: t("nav.walkthrough") },
    { href: "/how-it-works", label: t("nav.approach") },
  ];

  return (
    <>
      <header className="site-nav">
      <div className="nav-inner">
        <Link href="/" aria-label="NETBACK home">
          <Brand />
        </Link>
        <nav aria-label="Main navigation" className="desktop-nav">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={(l.href === "/" ? path === "/" : path.startsWith(l.href)) ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <button type="button" className="lang-toggle" onClick={toggleLocale} aria-label="Switch language">
          {t("nav.lang")}
        </button>
        <Link className="nav-operations" href="/admin">
          {t("nav.operations")} <span aria-hidden="true">↗</span>
        </Link>
        <button
          className="menu-button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label="Toggle menu"
          onClick={() => setOpen(!open)}
        >
          {open ? `${t("nav.close")} ✕` : `${t("nav.menu")} ☰`}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile navigation" className="mobile-nav">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link href="/admin" onClick={() => setOpen(false)}>
            {t("nav.operations")} ↗
          </Link>
          <button type="button" className="lang-toggle lang-toggle-mobile" onClick={toggleLocale}>
            {locale === "en" ? "한국어로 보기" : "Switch to English"}
          </button>
        </nav>
      )}
      </header>
      <BottomTabBar />
    </>
  );
}

function BottomTabBar() {
  const path = usePathname();
  const { t } = useLocale();
  const TABS = [
    { href: "/", label: t("nav.home"), icon: "⌂" },
    { href: "/report", label: t("nav.report"), icon: "📍" },
    { href: "/simulate", label: t("nav.walkthrough"), icon: "▶" },
    { href: "/lab", label: t("nav.lab"), icon: "⌁" },
    { href: "/admin", label: t("nav.operations"), icon: "▤" },
  ];
  return (
    <nav aria-label="Quick navigation" className="bottom-tab-bar">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? path === "/" : path.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className="bottom-tab" aria-current={active ? "page" : undefined}>
            <span className="bottom-tab-icon" aria-hidden="true">{tab.icon}</span>
            <span className="bottom-tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
