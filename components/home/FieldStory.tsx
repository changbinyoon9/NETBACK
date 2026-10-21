"use client";

import { useState } from "react";
import Image from "next/image";
import { useT, useLocale } from "@/lib/i18n/LocaleProvider";

const GALLERY: { src: string; alt: { en: string; ko: string } }[] = [
  { src: "/images/story/changbin-net-shore.jpg", alt: { en: "Holding up a recovered net sack on the rocks at Sinchang Harbor", ko: "신창항 방파제에서 직접 건져 올린 폐어망 자루를 들어 보이는 모습" } },
  { src: "/images/story/changbin-descent.jpg", alt: { en: "Suiting up with scuba gear, about to descend the harbor steps", ko: "스쿠버 장비를 메고 방파제 계단을 내려가는 모습" } },
  { src: "/images/story/changbin-gearup.jpg", alt: { en: "Gearing up before a recovery dive", ko: "회수 다이빙 전 장비를 점검하는 모습" } },
  { src: "/images/story/team-briefing.jpg", alt: { en: "Arc-Saver crew briefed alongside local fishermen before a dive", ko: "다이빙 전 지역 어민들과 함께 브리핑을 받는 Arc-Saver 단원들" } },
  { src: "/images/story/tidepool-collecting.jpg", alt: { en: "Wading through a debris-filled tide pool, bagging what's found", ko: "쓰레기로 뒤덮인 조수웅덩이를 걸으며 자루에 회수물을 담는 모습" } },
  { src: "/images/story/team-collecting.jpg", alt: { en: "The crew hauling recovered gear up from the water together", ko: "여러 단원이 함께 물속에서 회수물을 끌어올리는 모습" } },
  { src: "/images/story/haul-closeup.jpg", alt: { en: "Sorted nets, buoys and rope after a shoreline cleanup", ko: "해안 정화 후 분류된 그물, 부표, 로프" } },
  { src: "/images/story/net-bag-detail.jpg", alt: { en: "A sack of entangled net and line pulled from the water", ko: "물속에서 건져 올린 엉킨 그물과 줄이 담긴 자루" } },
  { src: "/images/story/truck-load.jpg", alt: { en: "A truck bed loaded with recovered gear, ready to haul out", ko: "회수물을 가득 실은 트럭" } },
  { src: "/images/story/excavator-haul.jpg", alt: { en: "An excavator lifting the heavier recovered debris on the dock", ko: "무거운 회수물을 굴착기로 옮기는 모습" } },
  { src: "/images/story/boat-return.jpg", alt: { en: "The crew and the day's haul aboard the boat, heading back in", ko: "하루치 회수물과 함께 배를 타고 돌아오는 단원들" } },
  { src: "/images/story/team-haul-dock.jpg", alt: { en: "The crew with a season's worth of recovered gear on the dock", ko: "한 시즌 동안 회수한 어구와 함께한 단원들" } },
];

export function FieldStory() {
  const t = useT();
  const { locale } = useLocale();
  const [selected, setSelected] = useState(0);
  const feature = GALLERY[selected];

  return (
    <section className="field-story-section">
      <div className="field-story-intro">
        <h2>{t("story.title")}</h2>
        <p className="field-story-lead">{t("story.lead")}</p>
        <p>{t("story.body1")}</p>
        <p>{t("story.body2")}</p>
        <p>{t("story.body3")}</p>
        <p>{t("story.body4")}</p>
      </div>

      <div className="field-story-feature">
        <div className="field-story-feature-media">
          <Image key={feature.src} src={feature.src} alt={locale === "ko" ? feature.alt.ko : feature.alt.en} fill sizes="(max-width: 800px) 90vw, 45vw" className="object-cover" priority />
        </div>
      </div>

      <div className="field-story-gallery">
        {GALLERY.map((photo, i) => (
          <button
            type="button"
            className={`field-story-photo ${i === selected ? "selected" : ""}`}
            key={photo.src}
            onClick={() => setSelected(i)}
            aria-pressed={i === selected}
            aria-label={locale === "ko" ? photo.alt.ko : photo.alt.en}
          >
            <Image src={photo.src} alt="" fill sizes="(max-width: 800px) 45vw, 23vw" className="object-cover" />
          </button>
        ))}
      </div>

      <p className="field-story-credit">{t("story.credit")}</p>
    </section>
  );
}
