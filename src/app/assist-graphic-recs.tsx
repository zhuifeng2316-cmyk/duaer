"use client";

import type { GraphicRecommendation } from "@/lib/talk-assist-shared";
import { recommendationShotLabel } from "@/lib/talk-assist-shared";
import styles from "./page.module.css";

export type AssistShotPreview = {
  stillUrl: string;
  text: string;
};

type ApplyTarget = "shot" | "all";

function tagSkin(tags?: string[]): string {
  const blob = (tags || []).join(" ");
  if (/chart|data|graph/.test(blob)) return styles.assistGfxSkinChart;
  if (/map/.test(blob)) return styles.assistGfxSkinMap;
  if (/mock-ui|showcase|carousel|chat/.test(blob)) return styles.assistGfxSkinUi;
  if (/handwritten|marker|checklist/.test(blob)) return styles.assistGfxSkinHand;
  if (/caption|type|title/.test(blob)) return styles.assistGfxSkinType;
  return styles.assistGfxSkinDefault;
}

export function AssistGraphicRecCards({
  recommendations,
  shots,
  frameClass,
  dense,
  busy,
  appliedKey,
  onApply,
}: {
  recommendations: GraphicRecommendation[];
  shots: AssistShotPreview[];
  frameClass: string;
  dense?: boolean;
  busy?: boolean;
  appliedKey?: string;
  onApply: (rec: GraphicRecommendation, target: ApplyTarget) => void;
}) {
  if (!recommendations.length) return null;
  return (
    <div className={dense ? styles.assistRecRow : styles.assistStageGrid}>
      {recommendations.map((rec) => {
        const shot =
          typeof rec.shotIndex === "number" && rec.shotIndex >= 0
            ? shots[rec.shotIndex]
            : shots.find((row) => row.stillUrl) || shots[0];
        const stillSrc = shot?.stillUrl || "";
        const shotLabel = recommendationShotLabel(rec, shots.length);
        const canShot = typeof rec.shotIndex === "number" && rec.shotIndex >= 0;
        const shotKey = `${rec.wraps}:shot:${rec.shotIndex ?? "all"}`;
        const allKey = `${rec.wraps}:all:${rec.shotIndex ?? "all"}`;
        const selected = appliedKey === shotKey || appliedKey === allKey;
        const kindLabel = rec.kind === "block" ? "画面块" : "叠层";
        return (
          <article
            key={`${rec.wraps}-${rec.shotIndex ?? "all"}`}
            className={selected ? `${styles.assistStyleCard} ${styles.assistStyleCardOn}` : styles.assistStyleCard}
          >
            <div className={`${styles.coverThumbFrame} ${frameClass}`}>
              {stillSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={stillSrc} alt="" />
              ) : (
                <span className={styles.waiting}>
                  <small>预览</small>
                </span>
              )}
              <div className={`${styles.assistGfxPreview} ${tagSkin(rec.tags)}`} aria-hidden>
                <span className={styles.assistGfxKind}>{kindLabel}</span>
                <p className={styles.assistGfxLabel}>{rec.label}</p>
                {shot?.text ? <em className={styles.assistGfxHint}>{shot.text.slice(0, 16)}</em> : null}
              </div>
            </div>
            <p className={styles.assistStyleName}>{rec.label}</p>
            <p className={styles.assistStyleShot}>
              {shotLabel} · {kindLabel}
            </p>
            <div className={styles.assistStyleActions}>
              {canShot ? (
                <button type="button" className={styles.assistStyleBtn} disabled={busy} onClick={() => onApply(rec, "shot")}>
                  用到这一镜
                </button>
              ) : null}
              <button type="button" className={styles.assistStyleBtnPrimary} disabled={busy} onClick={() => onApply(rec, "all")}>
                用到各镜
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
