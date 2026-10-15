"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Nav } from "@/components/Nav";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  const TABS = [
    { href: "/admin/operations", label: t("admin.tab.operations") },
    { href: "/admin", label: t("admin.tab.overview") },
    { href: "/admin/analytics", label: t("admin.tab.analytics") },
    { href: "/admin/business", label: t("admin.tab.business") },
  ];
  return (
    <div className="min-h-screen bg-offwhite">
      <Nav />
      <div className="operations-subnav">
        <span className="eyebrow">{t("admin.eyebrow").toUpperCase()}</span>
        <nav aria-label="Operations sections">
          {TABS.map((tab) => (
            <Link key={tab.href} href={tab.href} aria-current={pathname === tab.href ? "page" : undefined}>
              {tab.label}
            </Link>
          ))}
        </nav>
        <Link href="/lab" className="text-link">
          {t("admin.planScenario")} ↗
        </Link>
      </div>
      <main>{children}</main>
    </div>
  );
}
