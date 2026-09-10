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
  if (/code|terminal|vscode|developer/.test(blob)) return styles.assistGfxSkinUi;
  if (/mock-ui|showcase|carousel|chat/.test(blob)) return styles.assistGfxSkinUi;
  if (/handwritten|marker|checklist/.test(blob)) return styles.assistGfxSkinHand;
  if (/caption|type|title/.test(blob)) return styles.assistGfxSkinType;
  return styles.assistGfxSkinDefault;
}

function graphicMotion(label: string, tags?: string[]): string {
  const blob = `${label} ${(tags || []).join(" ")}`;
  if (/闪白|\bflash\b/.test(blob)) return styles.assistGfxMotFlash;
  if (/漏光|light-leak|光漏/.test(blob)) return styles.assistGfxMotLeak;
  if (/故障|glitch/.test(blob)) return styles.assistGfxMotGlitch;
  if (/胶片|颗粒|grain|film|texture/.test(blob)) return styles.assistGfxMotGrain;
  if (/手写|handwritten|画框|涂鸦/.test(blob)) return styles.assistGfxMotHand;
  if (/高亮|karaoke|标注|下划线/.test(blob)) return styles.assistGfxMotHighlight;
  if (/转场|wipe|transition|叠化|划|推|拉|扫/.test(blob)) return styles.assistGfxMotWipe;
  if (/chart|data|graph|示波|图表|流程|地图|计数|金额/.test(blob)) return styles.assistGfxMotChart;
  if (/code|terminal|vscode|developer|终端|代码/.test(blob)) return styles.assistGfxMotCode;
  if (/mock-ui|showcase|carousel|chat|产品|对话|轮播/.test(blob)) return styles.assistGfxMotUi;
  if (/字重|kinetic|typography|标题/.test(blob)) return styles.assistGfxMotType;
  return styles.assistGfxMotPulse;
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
    <div className={dense ? styles.assistGfxList : styles.assistStageGrid}>
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
        const mot = graphicMotion(rec.label, rec.tags);
        return (
          <article
            key={`${rec.wraps}-${rec.shotIndex ?? "all"}`}
            className={
              selected
                ? `${styles.assistStyleCard} ${styles.assistStyleCardOn}`
                : styles.assistStyleCard
            }
          >
            <div className={`${styles.coverThumbFrame} ${styles.assistGfxFrame} ${frameClass}`}>
              {stillSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.assistGfxStill} src={stillSrc} alt="" />
              ) : (
                <span className={styles.waiting}>
                  <small>预览</small>
                </span>
              )}
              <div className={`${styles.assistGfxPreview} ${tagSkin(rec.tags)} ${mot}`} aria-hidden>
                <span className={styles.assistGfxLayerFlash} />
                <span className={styles.assistGfxLayerSweep} />
                <span className={styles.assistGfxLayerGrain} />
                <span className={styles.assistGfxLayerWipe} />
                <span className={styles.assistGfxLayerInk} />
                <span className={styles.assistGfxLayerBars} aria-hidden>
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span className={styles.assistGfxLayerPanel} />
                <div className={styles.assistGfxCopy}>
                  <span className={styles.assistGfxKind}>{kindLabel}</span>
                  <p className={styles.assistGfxLabel}>{rec.label}</p>
                  {shot?.text ? <em className={styles.assistGfxHint}>{shot.text.slice(0, 16)}</em> : null}
                </div>
              </div>
            </div>
            <p className={styles.assistStyleName}>{rec.label}</p>
            <p className={styles.assistStyleShot}>
              {shotLabel} · {kindLabel}
            </p>
            <div className={styles.assistStyleActions}>
              {canShot ? (
                <button
                  type="button"
                  className={styles.assistStyleBtn}
                  disabled={busy}
                  onClick={() => onApply(rec, "shot")}
                >
                  用到这一镜
                </button>
              ) : null}
              <button
                type="button"
                className={styles.assistStyleBtnPrimary}
                disabled={busy}
                onClick={() => onApply(rec, "all")}
              >
                用到各镜
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
