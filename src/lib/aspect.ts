export const ASPECTS = ["9:16", "3:4", "1:1", "4:3", "16:9"] as const;
export type Aspect = (typeof ASPECTS)[number];

export const QUALITIES = ["2K", "4K"] as const;
export type OutputQuality = (typeof QUALITIES)[number];

export const ASPECT_FAMILIES = ["portrait", "square", "landscape"] as const;
export type AspectFamily = (typeof ASPECT_FAMILIES)[number];

export const QUALITY_SIZE: Record<OutputQuality, Record<Aspect, { width: number; height: number }>> = {
  "2K": {
    "9:16": { width: 1440, height: 2560 },
    "3:4": { width: 1536, height: 2048 },
    "1:1": { width: 2048, height: 2048 },
    "4:3": { width: 2048, height: 1536 },
    "16:9": { width: 2560, height: 1440 },
  },
  "4K": {
    "9:16": { width: 2160, height: 3840 },
    "3:4": { width: 2160, height: 2880 },
    "1:1": { width: 4096, height: 4096 },
    "4:3": { width: 2880, height: 2160 },
    "16:9": { width: 3840, height: 2160 },
  },
};

const ASPECT_LABEL: Record<Aspect, string> = {
  "9:16": "竖屏",
  "3:4": "竖图",
  "1:1": "方图",
  "4:3": "横图",
  "16:9": "横屏",
};

/** Default 2K pixels + C-end label. Prefer `aspectSize(aspect, quality)`. */
export const ASPECT_SIZE: Record<Aspect, { width: number; height: number; label: string }> = {
  "9:16": { ...QUALITY_SIZE["2K"]["9:16"], label: ASPECT_LABEL["9:16"] },
  "3:4": { ...QUALITY_SIZE["2K"]["3:4"], label: ASPECT_LABEL["3:4"] },
  "1:1": { ...QUALITY_SIZE["2K"]["1:1"], label: ASPECT_LABEL["1:1"] },
  "4:3": { ...QUALITY_SIZE["2K"]["4:3"], label: ASPECT_LABEL["4:3"] },
  "16:9": { ...QUALITY_SIZE["2K"]["16:9"], label: ASPECT_LABEL["16:9"] },
};

export function parseQuality(raw: string | null | undefined): OutputQuality {
  const v = (raw || "").trim() as OutputQuality;
  return QUALITIES.includes(v) ? v : "2K";
}

export function aspectSize(aspect: Aspect, quality: OutputQuality = "2K"): { width: number; height: number; label: string } {
  return { ...QUALITY_SIZE[quality][aspect], label: ASPECT_LABEL[aspect] };
}

export function aspectFamily(aspect: Aspect): AspectFamily {
  if (aspect === "9:16" || aspect === "3:4") return "portrait";
  if (aspect === "1:1") return "square";
  return "landscape";
}

export function parseAspect(raw: string | null | undefined): Aspect {
  const v = (raw || "").trim() as Aspect;
  return ASPECTS.includes(v) ? v : "9:16";
}

export const MOTIONS = ["push-in", "pull-out", "pan-left", "pan-right", "punch"] as const;
export type Motion = (typeof MOTIONS)[number];

export function parseMotion(raw: string | null | undefined): Motion {
  const v = (raw || "").trim() as Motion;
  return MOTIONS.includes(v) ? v : "push-in";
}

/** ffmpeg zoompan filter for a still, sized to the chosen aspect. */
export function motionFilter(motion: Motion, aspect: Aspect, durationSec: number, quality: OutputQuality = "2K"): string {
  const { width, height } = aspectSize(aspect, quality);
  const dur = Math.max(2, durationSec);
  const fps = 25;
  const frames = Math.max(fps * dur, fps * 2);
  const scaleW = Math.round(width * 1.45);
  const scaleH = Math.round(height * 1.45);
  const z: Record<Motion, string> = {
    "push-in": `min(zoom+0.0026,1.38)`,
    "pull-out": `if(eq(on,1),1.36,max(zoom-0.0024,1.0))`,
    "pan-left": `min(zoom+0.0009,1.18)`,
    "pan-right": `min(zoom+0.0009,1.18)`,
    punch: `min(zoom+0.0065,1.55)`,
  };
  const x: Record<Motion, string> = {
    "push-in": `iw/2-(iw/zoom/2)`,
    "pull-out": `iw/2-(iw/zoom/2)`,
    "pan-left": `iw/2-(iw/zoom/2)-((on/${frames})*90)`,
    "pan-right": `iw/2-(iw/zoom/2)+((on/${frames})*90)`,
    punch: `iw/2-(iw/zoom/2)`,
  };
  return [
    `scale=${scaleW}:${scaleH}:force_original_aspect_ratio=increase`,
    `crop=${scaleW}:${scaleH}`,
    `zoompan=z='${z[motion]}':x='${x[motion]}':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${fps}`,
  ].join(",");
}
