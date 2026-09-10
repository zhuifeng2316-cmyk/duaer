"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Aspect } from "@/lib/aspect";
import { COMPOSE_LAYOUT_LABEL, STILL_KIND_LABEL, type ComposeLayout, type StillKind } from "@/lib/compose-plan";
import {
  graphicIsHost,
  graphicKnobs,
  graphicSlots,
  shotGraphicName,
  shotNeedsPersonStill,
  talkPicturesReady,
} from "@/lib/graphic-board";
import { graphicLabel, isKnownGraphic, VISUAL_MODE_LABEL, type VisualMode } from "@/lib/hf-labels";
import { LETTERING_MODE_LABEL, type LetteringMode } from "@/lib/skill-recipes";
import {
  CARD_CAPTION_STYLES,
  CARD_CHIP_PREVIEWS,
  CARD_RAIL_PREVIEWS,
  FX_CAPTION_STYLES,
  FX_CHIP_PREVIEWS,
  FX_RAIL_PREVIEWS,
  FRAME_CAPTION_STYLES,
  FRAME_PILL_PREVIEWS,
  HOUSE_CAPTION_STYLES,
  LOOK_CAPTION_STYLES,
  LOOK_CHIP_PREVIEWS,
  LOOK_RAIL_PREVIEWS,
  MOVE_CAPTION_STYLES,
  MOVE_CHIP_PREVIEWS,
  MOVE_RAIL_PREVIEWS,
  POP_CAPTION_STYLES,
  POP_CHIP_PREVIEWS,
  POP_RAIL_PREVIEWS,
  PREVIEW_CHAR_SPLIT,
  PREVIEW_SLAM_STACK,
  captionPreviewTokens,
  captionStyleLabel,
  resolveCaptionStyle,
} from "@/lib/caption-styles";
import { COVER_TEMPLATES, coverTitle, parseCoverTemplate, wrapCoverTitle } from "@/lib/cover-templates";
import type { PublicProject } from "@/lib/types";
import { isProduceDockPhase, PRODUCE_STEPS, produceStepIndex } from "@/lib/talk-progress";
import type { CaptionRecommendation } from "@/lib/talk-assist";
import { AssistCaptionRecCards } from "./assist-caption-recs";
import styles from "./page.module.css";

type Shot = {
  scene: string;
  imagePrompt?: string;
  onScreenText: string;
  voiceover: string;
  durationSec: number;
  motion: string;
  kind?: StillKind;
  layout?: ComposeLayout;
  overlay?: string;
  block?: string;
  graphicIntent?: string;
  graphicVars?: Record<string, string | number>;
  graphicAssets?: Record<string, string>;
  hostStill?: boolean;
  lettering?: LetteringMode;
  captionStyle?: string;
};

function CopyLines({ script }: { script: NonNullable<PublicProject["script"]> }) {
  return (
    <ol className={styles.shots}>
      <li>
        <em className={styles.shotLine}>钩子</em> {script.hook}
      </li>
      {script.shots.map((s, i) => (
        <li key={i}>
          <em className={styles.shotLine}>{s.onScreenText || `镜 ${i + 1}`}</em> {s.voiceover}
        </li>
      ))}
      <li>
        <em className={styles.shotLine}>结尾</em> {script.cta}
      </li>
    </ol>
  );
}

function shotLayoutLine(shot: Shot): string {
  const kind = shot.kind ? STILL_KIND_LABEL[shot.kind] : "";
  const layout = shot.layout ? COMPOSE_LAYOUT_LABEL[shot.layout] : "";
  const name = shot.overlay || shot.block;
  const graphic = shot.graphicIntent || (isKnownGraphic(name) ? graphicLabel(name) : "");
  const lettering = shot.lettering ? LETTERING_MODE_LABEL[shot.lettering] : "";
  return [kind, layout, lettering, graphic].filter(Boolean).join(" · ");
}

function shotBoardText(shot: Shot): string {
  return (shot.imagePrompt || shot.scene || "").trim();
}

function GraphicPanel({
  shot,
  shotIndex,
  graphicUrls,
  disabled,
  onToggleStill,
  onVar,
  onUpload,
  onGenerate,
}: {
  shot: Shot;
  shotIndex: number;
  graphicUrls?: Record<string, string>;
  disabled: boolean;
  onToggleStill: (shotIndex: number, on: boolean) => void;
  onVar: (shotIndex: number, id: string, value: string | number) => void;
  onUpload: (shotIndex: number, slotId: string, file: File) => void;
  onGenerate: (shotIndex: number, slotId: string) => void;
}) {
  const name = shotGraphicName(shot);
  if (!name) return null;
  const knobs = graphicKnobs(name);
  const slots = graphicSlots(name);
  const host = graphicIsHost(name);
  return (
    <div className={styles.graphicBox}>
      {host ? (
        <div className={styles.graphicRow}>
          <label>
            <input
              type="checkbox"
              checked={shotNeedsPersonStill(shot)}
              disabled={disabled}
              onChange={(e) => onToggleStill(shotIndex, e.target.checked)}
            />{" "}
            人物底
          </label>
        </div>
      ) : null}
      {knobs.map((knob) => (
        <div key={knob.id} className={styles.graphicRow}>
          <label htmlFor={`g-${shotIndex}-${knob.id}`}>{knob.label}</label>
          {knob.type === "enum" ? (
            <select
              id={`g-${shotIndex}-${knob.id}`}
              disabled={disabled}
              value={String(shot.graphicVars?.[knob.id] ?? knob.options?.[0]?.value ?? "")}
              onChange={(e) => onVar(shotIndex, knob.id, e.target.value)}
            >
              {(knob.options || []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`g-${shotIndex}-${knob.id}`}
              type={knob.type === "number" ? "number" : "text"}
              disabled={disabled}
              min={knob.min}
              max={knob.max}
              value={String(shot.graphicVars?.[knob.id] ?? "")}
              onChange={(e) =>
                onVar(shotIndex, knob.id, knob.type === "number" ? Number(e.target.value) : e.target.value)
              }
            />
          )}
        </div>
      ))}
      {slots.length ? (
        <div className={styles.slots}>
          {slots.map((slot) => (
            <div key={slot.id} className={styles.slot}>
              {graphicUrls?.[slot.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={graphicUrls[slot.id]} alt={slot.label} />
              ) : (
                <small>{slot.label}</small>
              )}
              <small>{slot.label}</small>
              <div className={styles.slotBtns}>
                <label className={styles.redo}>
                  上传
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    disabled={disabled}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) onUpload(shotIndex, slot.id, file);
                    }}
                  />
                </label>
                <button className={styles.redo} type="button" disabled={disabled} onClick={() => onGenerate(shotIndex, slot.id)}>
                  系统出图
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function posterClass(aspect: Aspect): string {
  if (aspect === "1:1") return styles.sq;
  if (aspect === "16:9") return styles.wide;
  if (aspect === "4:3") return styles.classic;
  if (aspect === "3:4") return styles.photo;
  return styles.tall;
}

const CAPTION_PREVIEW_CLASS: Record<string, string> = {
  slam: styles.capSlam,
  editorial: styles.capEditorial,
  weight: styles.capWeight,
  highlight: styles.capHighlight,
  wipe: styles.capWipe,
  follow: styles.capFollow,
  glitch: styles.capGlitch,
  neon: styles.capNeon,
  neonAccent: styles.capNeonAccent,
  blend: styles.capBlend,
  emoji: styles.capEmoji,
  gradient: styles.capGradient,
  matrix: styles.capMatrix,
  parallax: styles.capParallax,
  particle: styles.capParticle,
  karaoke: styles.capKaraoke,
  texture: styles.capTexture,
  lookCream: styles.lookCream,
  lookInk: styles.lookInk,
  lookEditorial: styles.lookEditorial,
  lookKeynote: styles.lookKeynote,
  lookDocumentary: styles.lookDocumentary,
  lookLoud: styles.lookLoud,
  lookNeon: styles.lookNeon,
  lookGlitch: styles.lookGlitch,
  lookChrome: styles.lookChrome,
  lookVelocity: styles.lookVelocity,
  lookAnchor: styles.lookAnchor,
  lookOrdnance: styles.lookOrdnance,
  lookTerminal: styles.lookTerminal,
  lookNeonsign: styles.lookNeonsign,
  lookStardust: styles.lookStardust,
  lookStomp: styles.lookStomp,
  lookLastpage: styles.lookLastpage,
  lookScoreboard: styles.lookScoreboard,
  lookTransit: styles.lookTransit,
  lookVhs: styles.lookVhs,
  lookArcade: styles.lookArcade,
  lookDossier: styles.lookDossier,
  lookLaser: styles.lookLaser,
  lookThunder: styles.lookThunder,
  lookHologram: styles.lookHologram,
  lookBiolume: styles.lookBiolume,
  lookAurora: styles.lookAurora,
  lookSpectrum: styles.lookSpectrum,
  lookPapercut: styles.lookPapercut,
  lookPopup: styles.lookPopup,
  lookChalk: styles.lookChalk,
  lookGraffiti: styles.lookGraffiti,
  lookBrush: styles.lookBrush,
  lookInkwater: styles.lookInkwater,
  lookRansom: styles.lookRansom,
  fxTypewriter: styles.fxTypewriter,
  fxHwTitle: styles.fxHwTitle,
  fxHwWrite: styles.fxHwWrite,
  fxPath: styles.fxPath,
  fxCloud: styles.fxCloud,
  fxShimmer: styles.fxShimmer,
  fxStream: styles.fxStream,
  fxDrop: styles.fxDrop,
  fxWhiteboard: styles.fxWhiteboard,
  fxStitch: styles.fxStitch,
  fxTicker: styles.fxTicker,
  fxNotes: styles.fxNotes,
  fxExplode: styles.fxExplode,
  fxSlot: styles.fxSlot,
  fxMorph: styles.fxMorph,
  fxMarker: styles.fxMarker,
  fxAnnotate: styles.fxAnnotate,
  fxTiles: styles.fxTiles,
  fxScan: styles.fxScan,
  fxMarquee: styles.fxMarquee,
  fxStrike: styles.fxStrike,
  fxKinetic: styles.fxKinetic,
  fxRise: styles.fxRise,
  fxWave: styles.fxWave,
  frameCoral: styles.frameCoral,
  frameCapsule: styles.frameCapsule,
  frameForest: styles.frameForest,
  frameDaisy: styles.frameDaisy,
  frameBroadside: styles.frameBroadside,
  frameCreative: styles.frameCreative,
  frameCobalt: styles.frameCobalt,
  frameCode: styles.frameCode,
  frameCartesian: styles.frameCartesian,
  frameBlock: styles.frameBlock,
  framePoster: styles.framePoster,
  frameBlue: styles.frameBlue,
  frameBiennale: styles.frameBiennale,
  moveRgb: styles.moveRgb,
  moveBlurUp: styles.moveBlurUp,
  moveBottom: styles.moveBottom,
  moveSoft: styles.moveSoft,
  moveFocus: styles.moveFocus,
  moveHeadline: styles.moveHeadline,
  moveInline: styles.moveInline,
  moveLines: styles.moveLines,
  moveCrossfade: styles.moveCrossfade,
  moveTracking: styles.moveTracking,
  moveAxisY: styles.moveAxisY,
  moveAxisZ: styles.moveAxisZ,
  moveParticle: styles.moveParticle,
  moveSweep: styles.moveSweep,
  moveCallout: styles.moveCallout,
  moveEmphasis: styles.moveEmphasis,
  movePrism: styles.movePrism,
  moveFeather: styles.moveFeather,
  moveNews: styles.moveNews,
  moveThird: styles.moveThird,
  moveFlex: styles.moveFlex,
  moveAscii: styles.moveAscii,
  moveSwap: styles.moveSwap,
  moveCode: styles.moveCode,
  cardAcademic: styles.cardAcademic,
  cardEditorial: styles.cardEditorial,
  cardMinimal: styles.cardMinimal,
  cardSpotlight: styles.cardSpotlight,
  cardGeom: styles.cardGeom,
  cardWhiteboard: styles.cardWhiteboard,
  cardAudit: styles.cardAudit,
  cardTerminal: styles.cardTerminal,
  cardSwiss: styles.cardSwiss,
  cardSocial: styles.cardSocial,
  popScramble: styles.popScramble,
  popStagger: styles.popStagger,
  popTexture: styles.popTexture,
  popCount: styles.popCount,
  popLineSwap: styles.popLineSwap,
  popBlurIn: styles.popBlurIn,
  popPage: styles.popPage,
  popMatch: styles.popMatch,
  popFlap: styles.popFlap,
  popCursor: styles.popCursor,
  popFlash: styles.popFlash,
  popUnderline: styles.popUnderline,
  popWhite: styles.popWhite,
  popState: styles.popState,
  popDots: styles.popDots,
  popHalftone: styles.popHalftone,
};

export function captionPreviewLines(text: string): string[] {
  const cleaned = (text || "口播字").replace(/[，。！？、：；…—,.!?;:“”"'‘’\s]+/g, "").slice(0, 12);
  return wrapCoverTitle(cleaned || "口播字");
}

export function CaptionStylePreview({
  preview,
  lines,
  onBoard,
}: {
  preview: string;
  lines: string[];
  onBoard?: boolean;
}) {
  const joined = lines.join("");
  const title = lines.map((line, i) => (
    <span key={`${line}-${i}`}>
      {line}
      {i < lines.length - 1 ? <br /> : null}
    </span>
  ));
  const chips =
    LOOK_CHIP_PREVIEWS.has(preview) ||
    FX_CHIP_PREVIEWS.has(preview) ||
    MOVE_CHIP_PREVIEWS.has(preview) ||
    CARD_CHIP_PREVIEWS.has(preview) ||
    POP_CHIP_PREVIEWS.has(preview) ||
    preview === "highlight";
  const slamStack = PREVIEW_SLAM_STACK.has(preview);
  const charSplit = PREVIEW_CHAR_SPLIT.has(preview);
  let body: ReactNode;
  if (chips) {
    body = (
      <div className={styles.capHighlightRow}>
        {lines.map((line, i) => (
          <span key={`${line}-${i}`}>{line}</span>
        ))}
      </div>
    );
  } else if (slamStack) {
    const tokens = captionPreviewTokens(joined, "stack");
    const step = 2 / Math.max(tokens.length, 1);
    body = (
      <p className={styles.capMotStack}>
        {tokens.map((token, i) => (
          <span key={`${token}-${i}`} className={styles.capMotSlamUnit} style={{ animationDelay: `${i * step}s` }}>
            {token}
          </span>
        ))}
      </p>
    );
  } else if (charSplit) {
    const chars = captionPreviewTokens(joined, "chars");
    const unitClass =
      preview === "weight" || preview === "fxWave" || preview === "moveFlex" || preview === "popState"
        ? styles.capMotWeightUnit
        : preview === "fxTypewriter" || preview === "moveCode" || preview === "moveEmphasis" || preview === "popCursor" || preview === "fxNotes"
          ? styles.capMotTypeUnit
          : preview === "glitch" || preview === "lookGlitch" || preview === "moveRgb" || preview === "popScramble"
            ? styles.capMotGlitchUnit
            : preview === "fxExplode"
              ? styles.capMotBurstUnit
              : styles.capMotCharUnit;
    body = (
      <p className={styles.capMotChars}>
        {chars.map((ch, i) => (
          <span key={`${ch}-${i}`} className={unitClass} style={{ animationDelay: `${i * 0.1}s` }}>
            {ch}
          </span>
        ))}
      </p>
    );
  } else if (preview === "karaoke") {
    body = (
      <p>
        <em>{joined}</em>
      </p>
    );
  } else if (preview === "emoji") {
    body = (
      <p>
        {title} <i>✦</i>
      </p>
    );
  } else if (preview === "fxStrike") {
    body = (
      <p>
        <s>{lines[0]}</s> {lines.slice(1).join("") || "新词"}
      </p>
    );
  } else if (preview === "popDots") {
    body = (
      <p>
        {title}
        <i className={styles.popDot}>·</i>
        <i className={styles.popDot}>·</i>
        <i className={styles.popDot}>·</i>
      </p>
    );
  } else {
    body = <p>{title}</p>;
  }
  const rail =
    LOOK_RAIL_PREVIEWS.has(preview) ||
    FX_RAIL_PREVIEWS.has(preview) ||
    FRAME_PILL_PREVIEWS.has(preview) ||
    MOVE_RAIL_PREVIEWS.has(preview) ||
    CARD_RAIL_PREVIEWS.has(preview) ||
    POP_RAIL_PREVIEWS.has(preview);
  return (
    <div
      className={`${styles.coverLetter} ${onBoard ? styles.capBoard : ""} ${CAPTION_PREVIEW_CLASS[preview] || styles.capEditorial}`}
      aria-hidden
    >
      {rail ? <div className={styles.capLookRail}>{body}</div> : body}
    </div>
  );
}

const COVER_PREVIEW_CLASS: Record<string, string> = {
  lockup: styles.coverLockup,
  calm: styles.coverCalm,
  slam: styles.coverSlam,
  cta: styles.coverCta,
  scramble: styles.coverScramble,
  magazine: styles.coverMagazine,
  neon: styles.coverNeon,
  glitch: styles.coverGlitch,
  hand: styles.coverHand,
  stamp: styles.coverStamp,
};

export function CaptionStyleTile({
  id,
  label,
  preview,
  lines,
  stillSrc,
  frameClass,
  selected,
  disabled,
  onPick,
}: {
  id: string;
  label: string;
  preview: string;
  lines: string[];
  stillSrc: string;
  frameClass: string;
  selected: boolean;
  disabled: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <button
      className={selected ? `${styles.coverThumb} ${styles.coverThumbOn}` : styles.coverThumb}
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onPick(id)}
    >
      <span className={`${styles.coverThumbFrame} ${frameClass}`}>
        {stillSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stillSrc} alt="" />
        ) : (
          <span className={styles.waiting}>
            <small>预览</small>
          </span>
        )}
        <CaptionStylePreview preview={preview} lines={lines} />
      </span>
      <span className={styles.coverThumbLabel}>{label}</span>
    </button>
  );
}

function CoverStylePreview({
  preview,
  lines,
}: {
  preview: string;
  lines: string[];
}) {
  const title = lines.map((line, i) => (
    <span key={`${line}-${i}`}>
      {line}
      {i < lines.length - 1 ? <br /> : null}
    </span>
  ));
  return (
    <div className={`${styles.coverLetter} ${COVER_PREVIEW_CLASS[preview] || styles.coverLockup}`} aria-hidden>
      {preview === "cta" ? (
        <>
          <p>{lines.join("")}</p>
          <em>听完这条</em>
        </>
      ) : preview === "stamp" ? (
        <div className={styles.coverStampBand}>{title}</div>
      ) : (
        <p>{title}</p>
      )}
    </div>
  );
}

export function TalkWorkspace({
  talkId,
  assistRecommendations = [],
  assistShots = [],
  assistFrameClass = "",
  assistRefreshTick = 0,
  onAssistApply,
}: {
  talkId: string;
  assistRecommendations?: CaptionRecommendation[];
  assistShots?: { stillUrl: string; text: string }[];
  assistFrameClass?: string;
  assistRefreshTick?: number;
  onAssistApply?: () => void;
}) {
  const [project, setProject] = useState<PublicProject | null>(null);
  const [error, setError] = useState("");
  const [confirmingCopy, setConfirmingCopy] = useState(false);
  const [regening, setRegening] = useState(false);
  const [reassembling, setReassembling] = useState(false);
  const [covering, setCovering] = useState(false);
  const [pickingCover, setPickingCover] = useState(false);
  const [coverTemplate, setCoverTemplate] = useState(parseCoverTemplate(undefined));
  const [pickingCaption, setPickingCaption] = useState<false | "all" | number>(false);
  const [captionPick, setCaptionPick] = useState("");
  const [captionBusy, setCaptionBusy] = useState(false);
  const [graphicBusy, setGraphicBusy] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/projects/${talkId}`, { cache: "no-store" });
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok || !data.project) {
        setMissing(true);
        setError("这条口播不在了");
        return;
      }
      setProject(data.project);
    })();
    return () => {
      cancelled = true;
    };
  }, [talkId, assistRefreshTick]);

  useEffect(() => {
    if (project?.coverTemplate) setCoverTemplate(parseCoverTemplate(project.coverTemplate));
  }, [project?.coverTemplate]);

  const producing = project?.status === "queued" || project?.status === "running";

  useEffect(() => {
    if (!project?.id) return;
    if (project.status === "ready" || project.status === "failed" || project.status === "review") return;
    const ms = project.phase === "copy" || project.phase === "board" ? 280 : 1000;
    const t = setInterval(async () => {
      const res = await fetch(`/api/projects/${project.id}`);
      const data = await res.json();
      if (data.project) setProject(data.project);
    }, ms);
    return () => clearInterval(t);
  }, [project?.id, project?.status, project?.phase]);

  const reviewingCopy = project?.status === "review" && project.phase === "copy";
  const reviewingBoard = project?.status === "review" && project.phase === "board";
  const reviewingStills = project?.status === "review" && project.phase === "images";
  const writingCopy = producing && (project?.phase === "copy" || !project?.phase || project?.phase === "idle");
  const writingBoard = producing && project?.phase === "board";
  const shotCount = project?.script?.shots.length || 0;
  const showImageWall =
    reviewingStills ||
    (project?.stillUrls.length || 0) > 0 ||
    Boolean(producing && project && isProduceDockPhase(project.phase));
  const showProduceDock =
    Boolean(project && showImageWall && isProduceDockPhase(project.phase) && (producing || project.status === "failed"));
  const produceStep = project ? produceStepIndex(project.phase) : -1;
  const slots = showImageWall ? Math.max(shotCount, project?.stillUrls.length || 0) : 0;

  async function confirmCopy() {
    if (!project || project.status !== "review" || confirmingCopy) return;
    setConfirmingCopy(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "确认失败");
      if (data.project) setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "确认失败");
    } finally {
      setConfirmingCopy(false);
    }
  }

  async function regenProjectStill(shotIndex: number) {
    if (!project || confirmingCopy || producing || regening) return;
    if (project.status !== "review" && project.status !== "ready") return;
    setRegening(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/regen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotIndex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "重做失败");
      if (data.project) setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重做失败");
    } finally {
      setRegening(false);
    }
  }

  async function retryFailed() {
    if (!project || project.status !== "failed" || retrying || producing) return;
    setRetrying(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/retry`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "重试失败");
      if (data.project) setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重试失败");
    } finally {
      setRetrying(false);
    }
  }

  async function assembleAgain() {
    if (!project?.htmlPath || reassembling || covering || producing) return;
    setReassembling(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/assemble`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "再出片失败");
      if (data.project) setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "再出片失败");
    } finally {
      setReassembling(false);
    }
  }

  async function regenCover() {
    if (!project?.finalUrl || covering || reassembling || producing) return;
    setCovering(true);
    setPickingCover(false);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: coverTemplate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "封面没换上");
      if (data.project) setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "封面没换上");
    } finally {
      setCovering(false);
    }
  }

  const canEditGraphic =
    (reviewingBoard || reviewingStills || project?.status === "ready") && !producing && !graphicBusy && !confirmingCopy;
  const canEditCaption =
    (reviewingStills || project?.status === "ready") && !producing && !captionBusy && !confirmingCopy;

  function openCaptionPicker(scope: "all" | number) {
    if (!project || !canEditCaption) return;
    setPickingCover(false);
    setPickingCaption(scope);
    if (scope === "all") setCaptionPick(project.captionStyle || "");
    else setCaptionPick(project.script?.shots[scope]?.captionStyle || project.captionStyle || "");
  }

  async function saveCaption(shotOnly: boolean) {
    if (!project || !canEditCaption) return;
    setCaptionBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/captions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style: captionPick,
          ...(shotOnly && typeof pickingCaption === "number" ? { shotIndex: pickingCaption } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "字幕没换上");
      if (data.project) setProject(data.project);
      setPickingCaption(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "字幕没换上");
    } finally {
      setCaptionBusy(false);
    }
  }

  async function applyAssistCaption(rec: CaptionRecommendation, target: "shot" | "all") {
    if (!project) return;
    setCaptionBusy(true);
    setError("");
    try {
      const body =
        target === "shot" && typeof rec.shotIndex === "number"
          ? { style: rec.id, shotIndex: rec.shotIndex }
          : { style: rec.id };
      const res = await fetch(`/api/projects/${project.id}/captions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "字幕没换上");
      if (data.project) setProject(data.project);
      onAssistApply?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "字幕没换上");
    } finally {
      setCaptionBusy(false);
    }
  }

  async function patchGraphic(body: FormData | Record<string, unknown>) {
    if (!project || !canEditGraphic) return;
    setGraphicBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/graphic`, {
        method: "POST",
        ...(body instanceof FormData
          ? { body }
          : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "改组件失败");
      if (data.project) setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "改组件失败");
    } finally {
      setGraphicBusy(false);
    }
  }

  async function rewriteCopy() {
    if (!project || project.status !== "review" || confirmingCopy) return;
    setConfirmingCopy(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/rewrite`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "重写失败");
      if (data.project) setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重写失败");
    } finally {
      setConfirmingCopy(false);
    }
  }

  if (missing) {
    return (
      <section className={styles.talkWork}>
        <p className={styles.err}>{error || "这条口播不在了"}</p>
      </section>
    );
  }

  if (!project) {
    return (
      <section className={styles.talkWork}>
        <div className={styles.empty}>
          <p>口播</p>
          <small>正在打开…</small>
        </div>
      </section>
    );
  }

  const captionStillSrc =
    pickingCaption === false
      ? ""
      : typeof pickingCaption === "number"
        ? project.stillUrls[pickingCaption] || project.stillUrls.find(Boolean) || ""
        : [...project.stillUrls].reverse().find(Boolean) || project.stillUrls.find(Boolean) || "";
  const captionCopyLines = captionPreviewLines(
    pickingCaption === false
      ? "口播字"
      : typeof pickingCaption === "number"
        ? project.script?.shots[pickingCaption]?.onScreenText || project.script?.hook || project.idea
        : project.script?.shots[0]?.onScreenText || project.script?.hook || project.idea,
  );

  return (
    <section className={styles.talkWork}>
      <div className={styles.panel}>
        {assistRecommendations.length ? (
          <div className={styles.assistStageRecs} aria-label="助手字幕预览">
            <div className={styles.assistStageHead}>
              <p className={styles.assistStageTitle}>助手推荐样式</p>
              <p className={styles.assistStageLede}>叠在对应故事片上预览，可只用这一镜或用到全片</p>
            </div>
            <AssistCaptionRecCards
              recommendations={assistRecommendations}
              shots={
                assistShots.length
                  ? assistShots
                  : (project?.script?.shots || []).map((shot, i) => ({
                      stillUrl: project?.stillUrls[i] || "",
                      text: shot.onScreenText || shot.voiceover || project?.idea || "口播字",
                    }))
              }
              frameClass={assistFrameClass || posterClass(project?.aspect || "9:16")}
              busy={captionBusy || producing}
              onApply={(rec, target) => void applyAssistCaption(rec, target)}
            />
          </div>
        ) : null}
        <p className={styles.talkIdea}>{project.idea}</p>
        {!showProduceDock ? (
          <div className={styles.bar}>
            <div>
              <b>{project.message}</b>
              <i className={styles.meter} style={{ width: `${project.progress}%` }} />
            </div>
            <span>
              {project.progress}% · {project.aspect} · {project.quality}
              {shotCount ? ` · ${shotCount}镜` : ""}
            </span>
          </div>
        ) : (
          <p className={styles.talkQuiet}>
            {project.aspect} · {project.quality}
            {shotCount ? ` · ${shotCount}镜` : ""}
          </p>
        )}
        {(error || project.error || project.status === "failed") && !showProduceDock && (
          <p className={styles.err}>
            {error || project.error || "没做成"}
            {project.status === "failed" ? (
              <button className={styles.redo} type="button" disabled={retrying || producing} onClick={() => void retryFailed()}>
                {retrying ? "重试中…" : "重试"}
              </button>
            ) : null}
          </p>
        )}
        {project.musicError && <p className={styles.warn}>配乐没加上：{project.musicError}</p>}
        {project.speechError && <p className={styles.warn}>口播没加上：{project.speechError}</p>}
        {project.composeError && <p className={styles.warn}>{project.composeError}</p>}

        {(writingCopy || writingBoard || reviewingCopy || reviewingBoard || reviewingStills || showImageWall) && (
          <div className={styles.stepStack}>
            {writingCopy && project.draftText ? (
              <div className={styles.copyReview}>
                <p className={styles.voiceLabel}>
                  口播文案
                  <small>正在写…</small>
                </p>
                <pre className={styles.streamDraft}>{project.draftText}</pre>
              </div>
            ) : null}

            {project.script && !writingCopy ? (
              <div className={styles.copyReview}>
                <p className={styles.voiceLabel}>
                  口播文案
                  <small>{reviewingCopy ? "确认后才写故事分镜文字" : "已确认"}</small>
                </p>
                <CopyLines script={project.script} />
                {reviewingCopy ? (
                  <div className={styles.reviewActions}>
                    <button className={styles.go} type="button" disabled={confirmingCopy} onClick={() => void confirmCopy()}>
                      {confirmingCopy ? "接下来写故事分镜…" : "确认文案，写故事分镜"}
                    </button>
                    <button className={styles.ratio} type="button" disabled={confirmingCopy} onClick={() => void rewriteCopy()}>
                      重写文案
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {writingBoard ? (
              <div className={styles.copyReview}>
                <p className={styles.voiceLabel}>
                  故事分镜
                  <small>正在写…</small>
                </p>
                {project.draftText ? (
                  <pre className={styles.streamDraft}>{project.draftText}</pre>
                ) : (
                  <p className={styles.lede}>正在写故事分镜…</p>
                )}
              </div>
            ) : null}

            {reviewingBoard && project.script ? (
              <div className={styles.copyReview}>
                <p className={styles.voiceLabel}>
                  故事分镜
                  <small>
                    {project.script.visualMode
                      ? `${VISUAL_MODE_LABEL[project.script.visualMode as VisualMode]} · 先确认这些场景描述，再按描述出图`
                      : "先确认这些场景描述，再按描述出图"}
                  </small>
                </p>
                <ol className={styles.shots}>
                  {project.script.shots.map((s, i) => (
                    <li key={i}>
                      <em className={styles.shotLine}>{s.onScreenText || `镜 ${i + 1}`}</em>
                      {shotLayoutLine(s) ? `${shotLayoutLine(s)} · ` : ""}
                      {s.imagePrompt || s.scene}
                      <GraphicPanel
                        shot={s}
                        shotIndex={i}
                        graphicUrls={project.graphicUrls?.[i]}
                        disabled={!canEditGraphic}
                        onToggleStill={(shotIndex, on) => void patchGraphic({ shotIndex, hostStill: on })}
                        onVar={(shotIndex, id, value) => void patchGraphic({ shotIndex, graphicVars: { [id]: value } })}
                        onUpload={(shotIndex, slotId, file) => {
                          const form = new FormData();
                          form.set("shotIndex", String(shotIndex));
                          form.set("slotId", slotId);
                          form.set("file", file);
                          void patchGraphic(form);
                        }}
                        onGenerate={(shotIndex, slotId) => void patchGraphic({ shotIndex, slotId, generate: true })}
                      />
                    </li>
                  ))}
                </ol>
                <div className={styles.reviewActions}>
                  <button className={styles.go} type="button" disabled={confirmingCopy} onClick={() => void confirmCopy()}>
                    {confirmingCopy ? "开始出图…" : "确认故事分镜，开始出图"}
                  </button>
                  <button className={styles.ratio} type="button" disabled={confirmingCopy} onClick={() => void rewriteCopy()}>
                    重写故事分镜
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {canEditCaption && slots > 0 && pickingCaption === false ? (
          <div className={styles.captionBar}>
            <button className={styles.ghost} type="button" disabled={producing || captionBusy} onClick={() => openCaptionPicker("all")}>
              全片字幕 · {captionStyleLabel(project.captionStyle)}
            </button>
          </div>
        ) : null}

        {pickingCaption !== false ? (
          <div className={styles.coverPick}>
            <p className={styles.coverPickTitle}>选字幕样式</p>
            <p className={styles.captionGroup}>口播字</p>
            <div className={styles.coverGrid}>
              <CaptionStyleTile
                id=""
                label="自动"
                preview="editorial"
                lines={captionCopyLines}
                stillSrc={captionStillSrc}
                frameClass={posterClass(project.aspect)}
                selected={captionPick === ""}
                disabled={captionBusy || producing}
                onPick={setCaptionPick}
              />
              {HOUSE_CAPTION_STYLES.map((row) => (
                <CaptionStyleTile
                  key={row.id}
                  id={row.id}
                  label={row.label}
                  preview={row.preview}
                  lines={captionCopyLines}
                  stillSrc={captionStillSrc}
                  frameClass={posterClass(project.aspect)}
                  selected={captionPick === row.id}
                  disabled={captionBusy || producing}
                  onPick={setCaptionPick}
                />
              ))}
            </div>
            <p className={styles.captionGroup}>电影字</p>
            <div className={styles.coverGrid}>
              {LOOK_CAPTION_STYLES.map((row) => (
                <CaptionStyleTile
                  key={row.id}
                  id={row.id}
                  label={row.label}
                  preview={row.preview}
                  lines={captionCopyLines}
                  stillSrc={captionStillSrc}
                  frameClass={posterClass(project.aspect)}
                  selected={captionPick === row.id}
                  disabled={captionBusy || producing}
                  onPick={setCaptionPick}
                />
              ))}
            </div>
            <p className={styles.captionGroup}>特效字</p>
            <div className={styles.coverGrid}>
              {FX_CAPTION_STYLES.map((row) => (
                <CaptionStyleTile
                  key={row.id}
                  id={row.id}
                  label={row.label}
                  preview={row.preview}
                  lines={captionCopyLines}
                  stillSrc={captionStillSrc}
                  frameClass={posterClass(project.aspect)}
                  selected={captionPick === row.id}
                  disabled={captionBusy || producing}
                  onPick={setCaptionPick}
                />
              ))}
            </div>
            <p className={styles.captionGroup}>气质条</p>
            <div className={styles.coverGrid}>
              {FRAME_CAPTION_STYLES.map((row) => (
                <CaptionStyleTile
                  key={row.id}
                  id={row.id}
                  label={row.label}
                  preview={row.preview}
                  lines={captionCopyLines}
                  stillSrc={captionStillSrc}
                  frameClass={posterClass(project.aspect)}
                  selected={captionPick === row.id}
                  disabled={captionBusy || producing}
                  onPick={setCaptionPick}
                />
              ))}
            </div>
            <p className={styles.captionGroup}>动效字</p>
            <div className={styles.coverGrid}>
              {MOVE_CAPTION_STYLES.map((row) => (
                <CaptionStyleTile
                  key={row.id}
                  id={row.id}
                  label={row.label}
                  preview={row.preview}
                  lines={captionCopyLines}
                  stillSrc={captionStillSrc}
                  frameClass={posterClass(project.aspect)}
                  selected={captionPick === row.id}
                  disabled={captionBusy || producing}
                  onPick={setCaptionPick}
                />
              ))}
            </div>
            <p className={styles.captionGroup}>片卡字</p>
            <div className={styles.coverGrid}>
              {CARD_CAPTION_STYLES.map((row) => (
                <CaptionStyleTile
                  key={row.id}
                  id={row.id}
                  label={row.label}
                  preview={row.preview}
                  lines={captionCopyLines}
                  stillSrc={captionStillSrc}
                  frameClass={posterClass(project.aspect)}
                  selected={captionPick === row.id}
                  disabled={captionBusy || producing}
                  onPick={setCaptionPick}
                />
              ))}
            </div>
            <p className={styles.captionGroup}>更多字</p>
            <div className={styles.coverGrid}>
              {POP_CAPTION_STYLES.map((row) => (
                <CaptionStyleTile
                  key={row.id}
                  id={row.id}
                  label={row.label}
                  preview={row.preview}
                  lines={captionCopyLines}
                  stillSrc={captionStillSrc}
                  frameClass={posterClass(project.aspect)}
                  selected={captionPick === row.id}
                  disabled={captionBusy || producing}
                  onPick={setCaptionPick}
                />
              ))}
            </div>
            <div
              className={
                typeof pickingCaption === "number"
                  ? `${styles.coverPickActions} ${styles.captionPickActions}`
                  : styles.coverPickActions
              }
            >
              <button className={styles.ghost} type="button" disabled={captionBusy || producing} onClick={() => setPickingCaption(false)}>
                取消
              </button>
              <button className={styles.go} type="button" disabled={captionBusy || producing} onClick={() => void saveCaption(false)}>
                {captionBusy ? "正在换字幕…" : "用到全片"}
              </button>
              {typeof pickingCaption === "number" ? (
                <button className={styles.go} type="button" disabled={captionBusy || producing} onClick={() => void saveCaption(true)}>
                  {captionBusy ? "正在换字幕…" : "只用这一条"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {slots === 0 ? (
          !reviewingCopy && !reviewingBoard && !reviewingStills && !writingCopy && !writingBoard ? (
            <div className={styles.empty}>
              <p>故事墙</p>
              <small>故事分镜定了之后，这里会按描述出图</small>
            </div>
          ) : null
        ) : (
          <div
            className={`${styles.wall} ${
              project.aspect === "16:9" || project.aspect === "4:3"
                ? styles.wallWide
                : project.aspect === "1:1"
                  ? styles.wallSq
                  : styles.wallTall
            }`}
          >
            {Array.from({ length: slots }, (_, i) => {
              const src = project.stillUrls[i];
              const shot = project.script?.shots[i];
              const board = shot ? shotBoardText(shot) : "";
              const slotPreview = shot ? Object.values(project.graphicUrls?.[i] || {})[0] : "";
              const frameSrc = src || slotPreview;
              const cap = shot ? resolveCaptionStyle(shot.captionStyle, project.captionStyle) : undefined;
              const canRedo =
                Boolean(src) && (reviewingStills || project.status === "ready") && !producing && !regening;
              return (
                <figure key={src || `slot-${i}`} className={styles.poster}>
                  <div className={`${styles.frame} ${posterClass(project.aspect)}${cap && frameSrc ? ` ${styles.capStill}` : ""}`}>
                    {frameSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={frameSrc} alt={board || shot?.onScreenText || `镜 ${i + 1}`} />
                    ) : (
                      <div className={styles.waiting}>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <small>{shot && !shotNeedsPersonStill(shot) ? "组件" : "出图中"}</small>
                      </div>
                    )}
                    {frameSrc && cap && shot ? (
                      <CaptionStylePreview
                        preview={cap.preview}
                        lines={captionPreviewLines(shot.onScreenText || shot.voiceover || "")}
                        onBoard
                      />
                    ) : null}
                  </div>
                  <figcaption>
                    <div className={styles.posterHead}>
                      <strong>{shot?.onScreenText || `镜 ${i + 1}`}</strong>
                      <span className={styles.posterActs}>
                      {src && (reviewingStills || project.status === "ready" || project.regenShotIndex === i) ? (
                        <button
                          className={styles.redo}
                          type="button"
                          disabled={!canRedo || confirmingCopy}
                          onClick={() => void regenProjectStill(i)}
                        >
                          {project.regenShotIndex === i ? "正在重做" : "重做这张"}
                        </button>
                      ) : null}
                      {canEditCaption && shot ? (
                        <button
                          className={styles.redo}
                          type="button"
                          disabled={producing || captionBusy}
                          onClick={() => openCaptionPicker(i)}
                        >
                          这条字幕
                        </button>
                      ) : null}
                      </span>
                    </div>
                    {shot ? (
                      <small>
                        {shot.durationSec}秒
                        {` · ${captionStyleLabel(shot.captionStyle || project.captionStyle)}`}
                        {shotLayoutLine(shot) ? ` · ${shotLayoutLine(shot)}` : ""}
                        {shot.scene ? ` · ${shot.scene}` : ""}
                      </small>
                    ) : null}
                    {board ? <p className={styles.posterPrompt}>{board}</p> : null}
                    {shot ? (
                      <GraphicPanel
                        shot={shot}
                        shotIndex={i}
                        graphicUrls={project.graphicUrls?.[i]}
                        disabled={!canEditGraphic}
                        onToggleStill={(shotIndex, on) => void patchGraphic({ shotIndex, hostStill: on })}
                        onVar={(shotIndex, id, value) => void patchGraphic({ shotIndex, graphicVars: { [id]: value } })}
                        onUpload={(shotIndex, slotId, file) => {
                          const form = new FormData();
                          form.set("shotIndex", String(shotIndex));
                          form.set("slotId", slotId);
                          form.set("file", file);
                          void patchGraphic(form);
                        }}
                        onGenerate={(shotIndex, slotId) => void patchGraphic({ shotIndex, slotId, generate: true })}
                      />
                    ) : null}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}

        {reviewingStills && (
          <div className={styles.reviewActions}>
            <button
              className={styles.go}
              type="button"
              disabled={confirmingCopy || !talkPicturesReady({ script: project.script, stills: project.stills })}
              onClick={() => void confirmCopy()}
            >
              {confirmingCopy ? "接下来生成口播…" : "确认画面，继续成片"}
            </button>
          </div>
        )}

        {showProduceDock ? (
          <div className={styles.produceDock} aria-live="polite">
            <p className={styles.produceNow}>{project.message}</p>
            <i className={styles.meter} style={{ width: `${project.progress}%` }} />
            <ol className={styles.produceSteps}>
              {PRODUCE_STEPS.map((step, i) => (
                <li
                  key={step.phase}
                  className={i === produceStep ? styles.produceOn : i < produceStep ? styles.produceDone : undefined}
                >
                  {step.label}
                </li>
              ))}
            </ol>
            {project.status === "failed" ? (
              <p className={styles.err}>
                {error || project.error || "没做成"}
                <button className={styles.redo} type="button" disabled={retrying || producing} onClick={() => void retryFailed()}>
                  {retrying ? "重试中…" : "重试"}
                </button>
              </p>
            ) : null}
          </div>
        ) : null}

        {project.script && !reviewingCopy && !reviewingBoard && !reviewingStills && !writingCopy && !writingBoard && !showImageWall && (
          <CopyLines script={project.script} />
        )}

        {project.finalUrl && (
          <video
            className={styles.video}
            src={project.finalUrl}
            poster={project.coverUrl || undefined}
            controls
            playsInline
          />
        )}

        {Boolean(project.htmlPath || (project.finalUrl && project.stillUrls.some(Boolean))) && !showProduceDock && (
          <>
          <div className={styles.cutActions}>
            {project.htmlPath && !pickingCover ? (
            <button
              className={styles.ghost}
              type="button"
              disabled={reassembling || covering || producing || !project.htmlPath}
              onClick={() => void assembleAgain()}
            >
              {reassembling || project.phase === "assemble" ? "正在再出一次片…" : "再出一次片"}
            </button>
            ) : null}
            {project.finalUrl && project.stillUrls.some(Boolean) && !pickingCover ? (
                <button
                  className={styles.ghost}
                  type="button"
                  disabled={covering || reassembling || producing}
                  onClick={() => {
                    setPickingCaption(false);
                    setPickingCover(true);
                  }}
                >
                  {covering || project.phase === "cover" ? "正在做封面…" : "重新生成封面"}
                </button>
            ) : null}
          </div>
            {project.finalUrl && project.stillUrls.some(Boolean) && pickingCover ? (
                <div className={styles.coverPick}>
                  <p className={styles.coverPickTitle}>选封面模版</p>
                  <div className={styles.coverGrid}>
                    {COVER_TEMPLATES.map((row) => (
                      <button
                        key={row.id}
                        className={coverTemplate === row.id ? `${styles.coverThumb} ${styles.coverThumbOn}` : styles.coverThumb}
                        type="button"
                        aria-pressed={coverTemplate === row.id}
                        disabled={covering || producing}
                        onClick={() => setCoverTemplate(row.id)}
                      >
                        <span className={`${styles.coverThumbFrame} ${posterClass(project.aspect)}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={[...project.stillUrls].reverse().find(Boolean) || project.coverUrl || ""}
                            alt=""
                          />
                          <CoverStylePreview preview={row.preview} lines={wrapCoverTitle(coverTitle(project.script, project.idea))} />
                        </span>
                        <span className={styles.coverThumbLabel}>{row.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className={styles.coverPickActions}>
                    <button
                      className={styles.ghost}
                      type="button"
                      disabled={covering || producing}
                      onClick={() => setPickingCover(false)}
                    >
                      取消
                    </button>
                    <button
                      className={styles.go}
                      type="button"
                      disabled={covering || producing}
                      onClick={() => void regenCover()}
                    >
                      {covering || project.phase === "cover" ? "正在做封面…" : "做成封面"}
                    </button>
                  </div>
                </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
