"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/LocaleProvider";

/** Shared login gate for every /admin/* route — mirrors the server-side check already enforced on /api/operations. */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session").then((r) => r.json()).then((d) => setAuthed(!!d.authed)).catch(() => setAuthed(false)).finally(() => setAuthChecked(true));
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginBusy(true); setLoginError("");
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (!res.ok) { setLoginError(t("adminOps.login.error")); return; }
      setAuthed(true);
    } finally {
      setLoginBusy(false);
    }
  }

  if (!authChecked) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-ink-soft">{t("adminOps.checking")}</div>;
  }

  if (!authed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <form onSubmit={login} className="w-full max-w-sm rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-navy">{t("adminOps.login.title")}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t("adminOps.login.body")}</p>
          <label className="mt-4 block">
            <span className="text-xs font-medium text-ink-soft">{t("adminOps.login.password")}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>
          {loginError && <p className="mt-2 text-sm text-red-600">{loginError}</p>}
          <button
            className="mt-4 w-full rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-50"
            disabled={loginBusy || !password}
          >
            {t("adminOps.login.submit")}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
