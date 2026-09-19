import clsx from "clsx";

export function StatCard({
  value,
  label,
  sub,
  accent = false,
}: {
  value: string;
  label: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-border bg-paper p-4 shadow-sm",
        accent && "border-ocean/30 bg-ocean/5"
      )}
    >
      <div className="text-2xl font-bold text-navy sm:text-3xl">{value}</div>
      <div className="mt-1 text-sm font-medium text-ink-soft">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
