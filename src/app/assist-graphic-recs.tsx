"use client";

import type { GraphicRecommendation } from "@/lib/talk-assist-shared";
import { recommendationShotLabel } from "@/lib/talk-assist-shared";
import styles from "./page.module.css";

export type AssistShotPreview = {
  stillUrl: string;
  text: string;
};

type ApplyTarget = "shot" | "all";

type GfxFx =
  | "flash"
  | "leak"
  | "glitch"
  | "grain"
  | "hand"
  | "highlight"
  | "wipe"
  | "chart"
  | "code"
  | "carousel"
  | "carouselCircle"
  | "carouselOrbit"
  | "carouselPath"
  | "carouselText"
  | "carouselVision"
  | "carouselRail"
  | "chat"
  | "notify"
  | "refresh"
  | "cursor"
  | "checklist"
  | "flow"
  | "ui"
  | "type"
  | "pulse";

function detectFx(label: string, tags?: string[], wraps?: string): GfxFx {
  const blob = `${label} ${wraps || ""} ${(tags || []).join(" ")}`;
  if (/闪白|\bflash\b/.test(blob)) return "flash";
  if (/漏光|light-leak|光漏/.test(blob)) return "leak";
  if (/故障|glitch/.test(blob)) return "glitch";
  if (/胶片|颗粒|grain|film|texture/.test(blob)) return "grain";
  if (/轮播|carousel|gallery|screen-flow/.test(blob)) {
    if (/字圆|text-circle|kinetic-text/.test(blob)) return "carouselText";
    if (/环绕|orbit/.test(blob)) return "carouselOrbit";
    if (/路径|path/.test(blob)) return "carouselPath";
    if (/视野|vision/.test(blob)) return "carouselVision";
    if (/屏流|rail|slot|screen-flow/.test(blob)) return "carouselRail";
    if (/圆|circle/.test(blob)) return "carouselCircle";
    return "carousel";
  }
  if (/对话|聊天|chat|ai-chat/.test(blob)) return "chat";
  if (/通知|notification|stack/.test(blob)) return "notify";
  if (/下拉|刷新|refresh|gesture/.test(blob)) return "refresh";
  if (/光标|cursor|pointer|大光标/.test(blob)) return "cursor";
  if (/打勾|清单|checklist/.test(blob)) return "checklist";
  if (/流程|flowchart|diagram/.test(blob)) return "flow";
  if (/手写|handwritten|画框|涂鸦/.test(blob)) return "hand";
  if (/高亮|karaoke|标注|下划线|划重点/.test(blob)) return "highlight";
  if (/转场|wipe|transition|叠化|划转/.test(blob)) return "wipe";
  if (/chart|data|graph|示波|图表|计数|金额|赛跑/.test(blob)) return "chart";
  if (/code|terminal|vscode|developer|终端|代码/.test(blob)) return "code";
  if (/mock-ui|showcase|产品展示|分享|界面/.test(blob)) return "ui";
  if (/字重|kinetic|typography|标题/.test(blob)) return "type";
  return "pulse";
}

function carouselTone(label: string, wraps?: string): string {
  const blob = `${label} ${wraps || ""}`;
  if (/[二2]/.test(blob)) return styles.assistGfxTone2;
  if (/[三3]/.test(blob)) return styles.assistGfxTone3;
  if (/[四4]/.test(blob)) return styles.assistGfxTone4;
  if (/[五5]/.test(blob)) return styles.assistGfxTone5;
  return styles.assistGfxTone1;
}

function fxSkin(fx: GfxFx): string {
  if (fx === "chart" || fx === "flow") return styles.assistGfxSkinChart;
  if (fx === "hand" || fx === "checklist") return styles.assistGfxSkinHand;
  if (
    fx === "code" ||
    fx.startsWith("carousel") ||
    fx === "chat" ||
    fx === "notify" ||
    fx === "refresh" ||
    fx === "cursor" ||
    fx === "ui"
  ) {
    return styles.assistGfxSkinUi;
  }
  if (fx === "type" || fx === "highlight") return styles.assistGfxSkinType;
  return styles.assistGfxSkinDefault;
}

function fxMot(fx: GfxFx): string {
  const map: Record<GfxFx, string> = {
    flash: styles.assistGfxMotFlash,
    leak: styles.assistGfxMotLeak,
    glitch: styles.assistGfxMotGlitch,
    grain: styles.assistGfxMotGrain,
    hand: styles.assistGfxMotHand,
    highlight: styles.assistGfxMotHighlight,
    wipe: styles.assistGfxMotWipe,
    chart: styles.assistGfxMotChart,
    code: styles.assistGfxMotCode,
    carousel: styles.assistGfxMotCarousel,
    carouselCircle: styles.assistGfxMotCarouselCircle,
    carouselOrbit: styles.assistGfxMotCarouselOrbit,
    carouselPath: styles.assistGfxMotCarouselPath,
    carouselText: styles.assistGfxMotCarouselText,
    carouselVision: styles.assistGfxMotCarouselVision,
    carouselRail: styles.assistGfxMotCarouselRail,
    chat: styles.assistGfxMotChat,
    notify: styles.assistGfxMotNotify,
    refresh: styles.assistGfxMotRefresh,
    cursor: styles.assistGfxMotCursor,
    checklist: styles.assistGfxMotChecklist,
    flow: styles.assistGfxMotFlow,
    ui: styles.assistGfxMotUi,
    type: styles.assistGfxMotType,
    pulse: styles.assistGfxMotPulse,
  };
  return map[fx];
}

function GraphicFxStage({
  fx,
  label,
  wraps,
}: {
  fx: GfxFx;
  label: string;
  wraps?: string;
}) {
  const tone = carouselTone(label, wraps);
  if (fx === "carouselCircle") {
    return (
      <div className={`${styles.assistGfxCarCircle} ${tone}`} aria-hidden>
        <div className={styles.assistGfxCarCircleRing}>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <em>圆</em>
      </div>
    );
  }
  if (fx === "carouselOrbit") {
    return (
      <div className={`${styles.assistGfxCarOrbit} ${tone}`} aria-hidden>
        <i />
        <i />
        <i />
        <b />
      </div>
    );
  }
  if (fx === "carouselPath") {
    return (
      <div className={`${styles.assistGfxCarPath} ${tone}`} aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }
  if (fx === "carouselText") {
    return (
      <div className={`${styles.assistGfxCarText} ${tone}`} aria-hidden>
        <div className={styles.assistGfxCarTextRing}>
          <b>口</b>
          <b>播</b>
          <b>字</b>
          <b>圆</b>
          <b>转</b>
          <b>场</b>
        </div>
      </div>
    );
  }
  if (fx === "carouselVision") {
    return (
      <div className={`${styles.assistGfxCarVision} ${tone}`} aria-hidden>
        <span />
        <span />
        <span />
      </div>
    );
  }
  if (fx === "carouselRail") {
    return (
      <div className={`${styles.assistGfxCarRail} ${tone}`} aria-hidden>
        <div className={styles.assistGfxCarRailTrack}>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }
  if (fx === "carousel") {
    return (
      <div className={`${styles.assistGfxCarousel} ${tone}`} aria-hidden>
        <div className={styles.assistGfxCarouselTrack}>
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>1</span>
        </div>
        <div className={styles.assistGfxCarouselDots}>
          <i />
          <i />
          <i />
        </div>
      </div>
    );
  }
  if (fx === "chat") {
    return (
      <div className={styles.assistGfxChat} aria-hidden>
        <b />
        <b />
        <b />
      </div>
    );
  }
  if (fx === "notify") {
    return (
      <div className={styles.assistGfxNotify} aria-hidden>
        <b />
        <b />
        <b />
      </div>
    );
  }
  if (fx === "refresh") {
    return (
      <div className={styles.assistGfxRefresh} aria-hidden>
        <i />
        <span />
        <span />
        <span />
      </div>
    );
  }
  if (fx === "cursor") {
    return (
      <div className={styles.assistGfxCursor} aria-hidden>
        <span />
        <i />
      </div>
    );
  }
  if (fx === "checklist") {
    return (
      <div className={styles.assistGfxChecklist} aria-hidden>
        <b>
          <i />
          <em />
        </b>
        <b>
          <i />
          <em />
        </b>
        <b>
          <i />
          <em />
        </b>
      </div>
    );
  }
  if (fx === "flow") {
    return (
      <div className={styles.assistGfxFlow} aria-hidden>
        <b />
        <i />
        <b />
        <i />
        <b />
      </div>
    );
  }
  if (fx === "chart") {
    return (
      <div className={styles.assistGfxLayerBars} aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </div>
    );
  }
  if (fx === "code") {
    return (
      <div className={styles.assistGfxCode} aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }
  if (fx === "ui") {
    return <span className={styles.assistGfxLayerPanel} />;
  }
  return (
    <>
      <span className={styles.assistGfxLayerFlash} />
      <span className={styles.assistGfxLayerSweep} />
      <span className={styles.assistGfxLayerGrain} />
      <span className={styles.assistGfxLayerWipe} />
      <span className={styles.assistGfxLayerInk} />
      {fx === "hand" || fx === "highlight" || fx === "type" ? (
        <p className={styles.assistGfxDemoType}>{label.slice(0, 6)}</p>
      ) : null}
    </>
  );
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
        const fx = detectFx(rec.label, rec.tags, rec.wraps);
        const hostLike = /carousel|chat|notify|refresh|cursor|checklist|flow|chart|code|ui/.test(fx);
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
              {stillSrc && !hostLike ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.assistGfxStill} src={stillSrc} alt="" />
              ) : stillSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={`${styles.assistGfxStill} ${styles.assistGfxStillDim}`} src={stillSrc} alt="" />
              ) : (
                <span className={styles.waiting}>
                  <small>预览</small>
                </span>
              )}
              <div className={`${styles.assistGfxPreview} ${fxSkin(fx)} ${fxMot(fx)}`} aria-hidden>
                <GraphicFxStage fx={fx} label={rec.label} wraps={rec.wraps} />
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
