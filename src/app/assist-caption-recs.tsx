"use client";

import { captionStyleMeta } from "@/lib/caption-styles";
import type { CaptionRecommendation } from "@/lib/talk-assist";
import { recommendationShotLabel } from "@/lib/talk-assist";
import { CaptionStylePreview, captionPreviewLines } from "./talk-workspace";
import styles from "./page.module.css";

export type AssistShotPreview = {
  stillUrl: string;
  text: string;
};

type ApplyTarget = "shot" | "all";

export function AssistCaptionRecCards({
  recommendations,
  shots,
  frameClass,
  dense,
  busy,
  onApply,
}: {
  recommendations: CaptionRecommendation[];
  shots: AssistShotPreview[];
  frameClass: string;
  dense?: boolean;
  busy?: boolean;
  onApply: (rec: CaptionRecommendation, target: ApplyTarget) => void;
}) {
  if (!recommendations.length) return null;
  return (
    <div className={dense ? styles.assistRecRow : styles.assistStageGrid}>
      {recommendations.map((rec) => {
        const meta = captionStyleMeta(rec.id);
        if (!meta) return null;
        const shot =
          typeof rec.shotIndex === "number" && rec.shotIndex >= 0
            ? shots[rec.shotIndex]
            : shots.find((row) => row.stillUrl) || shots[0];
        const stillSrc = shot?.stillUrl || "";
        const lines = captionPreviewLines(shot?.text || "口播字");
        const shotLabel = recommendationShotLabel(rec, shots.length);
        const canShot = typeof rec.shotIndex === "number" && rec.shotIndex >= 0;
        return (
          <article key={`${rec.id}-${rec.shotIndex ?? "all"}`} className={styles.assistStyleCard}>
            <div className={`${styles.coverThumbFrame} ${frameClass}`}>
              {stillSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={stillSrc} alt="" />
              ) : (
                <span className={styles.waiting}>
                  <small>预览</small>
                </span>
              )}
              <CaptionStylePreview preview={meta.preview} lines={lines} />
            </div>
            <p className={styles.assistStyleName}>{rec.label}</p>
            <p className={styles.assistStyleShot}>{shotLabel}</p>
            <div className={styles.assistStyleActions}>
              {canShot ? (
                <button type="button" className={styles.assistStyleBtn} disabled={busy} onClick={() => onApply(rec, "shot")}>
                  用到这一镜
                </button>
              ) : null}
              <button type="button" className={styles.assistStyleBtnPrimary} disabled={busy} onClick={() => onApply(rec, "all")}>
                用到全片
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
