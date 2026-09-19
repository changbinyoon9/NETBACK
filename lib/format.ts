export function fmtScore(n: number | null | undefined, digits = 3): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

export function fmtKm(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(2)} km`;
}

export function fmtTonnage(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(1)} t`;
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(digits)}%`;
}

export function fmtKRW(n: number): string {
  return `₩${Math.round(n).toLocaleString("en-US")}`;
}
