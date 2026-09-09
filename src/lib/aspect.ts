export const ASPECTS = ["9:16", "1:1", "16:9"] as const;
export type Aspect = (typeof ASPECTS)[number];

export const ASPECT_SIZE: Record<Aspect, { width: number; height: number; label: string }> = {
  "9:16": { width: 1080, height: 1920, label: "竖屏" },
  "1:1": { width: 1080, height: 1080, label: "方图" },
  "16:9": { width: 1920, height: 1080, label: "横屏" },
};

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
export function motionFilter(motion: Motion, aspect: Aspect, durationSec: number): string {
  const { width, height } = ASPECT_SIZE[aspect];
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
