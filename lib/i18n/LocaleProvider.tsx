"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { dictionary, LOCALES, type Locale } from "./dictionary";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  t: (key: string) => string;
  /** Translate a template string with {placeholder} substitution. */
  tf: (key: string, vars: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = "netback-locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && LOCALES.includes(stored)) {
        setLocaleState(stored);
        return;
      }
      // Default new visitors with a Korean browser locale to the Korean UI.
      if (navigator.language?.toLowerCase().startsWith("ko")) {
        setLocaleState("ko");
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — stay on default.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "ko" : "en");
  }, [locale, setLocale]);

  const t = useCallback(
    (key: string) => dictionary[locale][key] ?? dictionary.en[key] ?? key,
    [locale]
  );

  const tf = useCallback(
    (key: string, vars: Record<string, string | number>) => {
      const template = dictionary[locale][key] ?? dictionary.en[key] ?? key;
      return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, toggleLocale, t, tf }), [locale, setLocale, toggleLocale, t, tf]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

/** Shorthand for components that only need the translate function. */
export function useT() {
  return useLocale().t;
}

/** Shorthand for components that only need the templated translate function. */
export function useTf() {
  return useLocale().tf;
}
