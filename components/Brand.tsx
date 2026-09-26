import { GearIcon } from "./GearArt";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className={`brand ${light ? "brand-light" : ""}`}>
      <GearIcon kind="knot" width="42" height="42" />
      <span>NETBACK<span className="brand-sub">GOOD THINGS COME BACK.</span></span>
    </span>
  );
}
