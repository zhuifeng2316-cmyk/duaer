import { CINEMA_GRAPHIC_LOCK } from "./cinema";
import house from "./duaer-registry.json";
import type { Script, Shot } from "./types";

export type GraphicKnob = {
  id: string;
  label: string;
  type: "number" | "enum" | "text";
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
};

export type GraphicSlot = { id: string; label: string; hint: string };

type HouseRow = {
  wraps: string;
  host?: boolean;
  imageSlots?: Array<{ id: string; hint?: string; label?: string }>;
  knobs?: GraphicKnob[];
};

const HOUSE = house as HouseRow[];
const BY_WRAP = new Map(HOUSE.map((it) => [it.wraps, it]));

export function shotGraphicName(shot: Pick<Shot, "overlay" | "block">): string {
  return shot.overlay || shot.block || "";
}

export function graphicIsHost(name?: string): boolean {
  if (!name) return false;
  const row = BY_WRAP.get(name);
  if (row?.host != null) return row.host;
  return Boolean(row?.imageSlots?.length);
}

export function shotNeedsPersonStill(shot: Pick<Shot, "overlay" | "block" | "hostStill">): boolean {
  if (shot.hostStill === true) return true;
  if (shot.hostStill === false) {
    // Explicit false only sticks when a graphic is mounted. Orphaned false
    // (host stripped by aspect/recipe) must still ask for a person still.
    return !shotGraphicName(shot);
  }
  return !graphicIsHost(shotGraphicName(shot));
}

export function talkPicturesReady(project: { script: Script | null; stills: string[] }): boolean {
  const shots = project.script?.shots || [];
  if (!shots.length) return false;
  return shots.every((shot, i) => !shotNeedsPersonStill(shot) || Boolean(project.stills[i]));
}

export function graphicSlots(name?: string): GraphicSlot[] {
  const row = name ? BY_WRAP.get(name) : undefined;
  return (row?.imageSlots || []).map((slot, i) => ({
    id: slot.id,
    label: slot.label || `第${i + 1}屏`,
    hint: slot.hint || CINEMA_GRAPHIC_LOCK,
  }));
}

export function graphicKnobs(name?: string): GraphicKnob[] {
  return (name ? BY_WRAP.get(name)?.knobs : undefined) || [];
}

export function applyShotGraphic(
  script: Script,
  shotIndex: number,
  patch: { hostStill?: boolean; graphicVars?: Record<string, string | number> },
): Script {
  const shot = script.shots[shotIndex];
  if (!shot) return script;
  const knobs = graphicKnobs(shotGraphicName(shot));
  const vars = { ...(shot.graphicVars || {}) };
  if (patch.graphicVars) {
    for (const [key, raw] of Object.entries(patch.graphicVars)) {
      const knob = knobs.find((k) => k.id === key);
      if (!knob) continue;
      if (knob.type === "number") {
        let n = Number(raw);
        if (!Number.isFinite(n)) continue;
        if (knob.min != null) n = Math.max(knob.min, n);
        if (knob.max != null) n = Math.min(knob.max, n);
        vars[key] = n;
      } else if (knob.type === "enum") {
        const allowed = (knob.options || []).map((o) => o.value);
        const v = String(raw);
        if (allowed.includes(v)) vars[key] = v;
      } else {
        vars[key] = String(raw);
      }
    }
  }
  const next = script.shots.slice();
  next[shotIndex] = {
    ...shot,
    hostStill: patch.hostStill == null ? shot.hostStill : patch.hostStill,
    graphicVars: { ...vars, ...(shot.graphicAssets || {}) },
  };
  return { ...script, shots: next };
}
