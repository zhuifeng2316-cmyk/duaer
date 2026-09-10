"use client";

import type { ReactNode } from "react";
import {
  CARD_CHIP_PREVIEWS,
  CARD_RAIL_PREVIEWS,
  FX_CHIP_PREVIEWS,
  FX_RAIL_PREVIEWS,
  FRAME_PILL_PREVIEWS,
  LOOK_CHIP_PREVIEWS,
  LOOK_RAIL_PREVIEWS,
  MOVE_CHIP_PREVIEWS,
  MOVE_RAIL_PREVIEWS,
  POP_CHIP_PREVIEWS,
  POP_RAIL_PREVIEWS,
  PREVIEW_CHAR_SPLIT,
  PREVIEW_SLAM_STACK,
  captionPreviewTokens,
} from "@/lib/caption-styles";
import { wrapCoverTitle } from "@/lib/cover-templates";
import styles from "./page.module.css";

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

