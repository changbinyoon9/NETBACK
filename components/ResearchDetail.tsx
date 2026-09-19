export function ResearchDetail({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="mt-2 space-y-1 rounded-lg border border-navy/15 bg-navy/[0.03] p-3 text-xs">
      {rows.map((r) => (
        <div key={r.label} className="flex gap-2">
          <span className="w-24 shrink-0 font-semibold tracking-wide text-navy/70 uppercase">{r.label}</span>
          <span className="text-ink-soft">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
