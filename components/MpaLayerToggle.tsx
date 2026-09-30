"use client";

import { useT } from "@/lib/i18n/LocaleProvider";

export function MpaLayerToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const t = useT();
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-ink-soft">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-[#7c6fa8]"
      />
      <span className="inline-block h-2.5 w-2.5 rounded-sm border border-[#7c6fa8]/60 bg-[#8b7fc7]/25" />
      {t("mpaToggle.label")}
    </label>
  );
}
