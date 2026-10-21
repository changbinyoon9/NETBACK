"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/LocaleProvider";
import { GearIcon } from "./GearArt";
export function ServiceAccess(){
 const t=useT();const router=useRouter();const [id,setId]=useState("");
 return <section className="service-access" aria-labelledby="service-access-title">
  <div className="service-access-heading"><p className="dock-kicker">NETBACK SERVICE</p><h2 id="service-access-title">{t("service.title")}</h2><p>{t("service.intro")}</p></div>
  <div className="service-links">{([
   ["report","/report","buoy"],["plan","/lab/planner","vessel"],["guide","/how-it-works","knot"]
  ] as const).map(([key,href,kind],i)=><Link href={href} key={key}><span className="service-number">0{i+1}</span><GearIcon kind={kind} width={56}/><h3>{t(`service.${key}.title`)}</h3><p>{t(`service.${key}.body`)}</p><span className="service-arrow" aria-hidden="true">↗</span></Link>)}</div>
  <form className="service-track" onSubmit={e=>{e.preventDefault();const code=id.trim();if(code)router.push(`/report/${encodeURIComponent(code)}`);}}><label htmlFor="home-report-id"><strong>{t("service.track.title")}</strong><span>{t("service.track.body")}</span></label><div><input id="home-report-id" value={id} onChange={e=>setId(e.target.value)} placeholder="NB-R-…" maxLength={100} required autoComplete="off"/><button type="submit">{t("service.track.submit")} ↗</button></div></form>
 </section>;
}
export function ServiceFaq(){const t=useT();return <section className="service-faq"><p className="dock-kicker">FAQ</p><h2>{t("service.faq.title")}</h2>{[1,2,3,4].map(n=><details key={n}><summary>{t(`service.faq.${n}.q`)}</summary><p>{t(`service.faq.${n}.a`)}</p></details>)}</section>;}
