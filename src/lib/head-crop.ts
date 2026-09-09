import { spawn } from "child_process";
import { copyFile, mkdir } from "fs/promises";
import path from "path";
import {
  authHeaders,
  getFlowApiKey,
  getFlowBaseUrl,
  getScriptModel,
  getTextModel,
  mapFlowHttpError,
  readFlowJson,
} from "./flow/config";
import { extractChatContent, extractJsonObject } from "./flow/json";
import { fileToDataUrl } from "./flow/image";

export type HeadBox = { x: number; y: number; w: number; h: number };

export const DEFAULT_HEAD_BOX: HeadBox = { x: 12, y: 2, w: 76, h: 58 };
export const MAX_HEADS = 8;

export const HEAD_DETECT_PROMPT = [
  "看这张照片，框出画面里每一颗人的头（含全部头发、耳朵、下巴，并带一点脖子和肩）。",
  "不要只框五官，不要切成脸的一角。不要框半身和衣服主体。有几个人就框几个，从左到右。",
  '只输出 JSON：{"heads":[{"x":0,"y":0,"w":30,"h":40}]}',
  "数字是相对整张图的百分比，左上角为原点。一个人也要放进 heads 数组。最多 8 个。框要完整包住头，四周留一点边。",
].join("");

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clampHeadBox(raw: Partial<Record<string, unknown>> | HeadBox): HeadBox {
  let x = clamp(asNumber(raw.x, DEFAULT_HEAD_BOX.x), 0, 90);
  let y = clamp(asNumber(raw.y, DEFAULT_HEAD_BOX.y), 0, 90);
  const w = clamp(asNumber(raw.w, DEFAULT_HEAD_BOX.w), 20, 100 - x);
  const h = clamp(asNumber(raw.h, DEFAULT_HEAD_BOX.h), 20, 100 - y);
  x = clamp(x, 0, 100 - w);
  y = clamp(y, 0, 100 - h);
  return { x, y, w, h };
}

/** Expand a tight face box so hair and chin are not clipped. */
export function padHeadBox(box: HeadBox, padRatio = 0.2): HeadBox {
  const px = box.w * padRatio;
  const py = box.h * padRatio;
  return clampHeadBox({
    x: box.x - px,
    y: box.y - py,
    w: box.w + px * 2,
    h: box.h + py * 2,
  });
}

export function headBoxIou(a: HeadBox, b: HeadBox): number {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y));
  const inter = ix * iy;
  const union = a.w * a.h + b.w * b.h - inter;
  return union <= 0 ? 0 : inter / union;
}

export function dedupeHeadBoxes(boxes: HeadBox[]): HeadBox[] {
  const sorted = [...boxes].sort((a, b) => a.x - b.x || a.y - b.y);
  const kept: HeadBox[] = [];
  for (const box of sorted) {
    const hit = kept.findIndex((k) => headBoxIou(k, box) > 0.55);
    if (hit < 0) kept.push(box);
    else if (box.w * box.h > kept[hit]!.w * kept[hit]!.h) kept[hit] = box;
  }
  return kept.slice(0, MAX_HEADS);
}

function boxesFromUnknown(items: unknown[]): HeadBox[] {
  return dedupeHeadBoxes(
    items
      .filter((item) => item && typeof item === "object")
      .map((item) => clampHeadBox(item as Record<string, unknown>)),
  );
}

export function parseHeadBoxes(raw: string): HeadBox[] {
  try {
    const parsed = extractJsonObject(raw);
    if (Array.isArray(parsed)) {
      const boxes = boxesFromUnknown(parsed);
      return boxes.length ? boxes : [{ ...DEFAULT_HEAD_BOX }];
    }
    if (parsed && typeof parsed === "object") {
      const o = parsed as Record<string, unknown>;
      if (Array.isArray(o.heads)) {
        const boxes = boxesFromUnknown(o.heads);
        return boxes.length ? boxes : [{ ...DEFAULT_HEAD_BOX }];
      }
      if ("x" in o || "w" in o) return [clampHeadBox(o)];
    }
  } catch {
    /* fallback */
  }
  return [{ ...DEFAULT_HEAD_BOX }];
}

export function parseHeadBox(raw: string): HeadBox {
  return parseHeadBoxes(raw)[0] || { ...DEFAULT_HEAD_BOX };
}

function tokenField(model: string, maxTokens: number): Record<string, number> {
  if (/^(gpt-|o\d)/i.test(model)) return { max_completion_tokens: maxTokens };
  return { max_tokens: maxTokens };
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim().split("\n").slice(-6).join(" | ") || `${cmd} ${code}`));
    });
  });
}

export async function detectHeadBoxes(photoPath: string): Promise<HeadBox[]> {
  const apiKey = getFlowApiKey();
  if (!apiKey) return [{ ...DEFAULT_HEAD_BOX }];

  const dataUrl = await fileToDataUrl(photoPath);
  const models = [getScriptModel(), getTextModel()].filter((m, i, arr) => arr.indexOf(m) === i);

  for (const model of models) {
    try {
      const res = await fetch(`${getFlowBaseUrl()}/api/v1/chat/completions`, {
        method: "POST",
        headers: authHeaders(apiKey),
        body: JSON.stringify({
          model,
          temperature: 0,
          ...tokenField(model, 400),
          messages: [
            { role: "system", content: "你框出照片里每一颗头，不写衣服，只输出 JSON。" },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
                { type: "text", text: HEAD_DETECT_PROMPT },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(45_000),
      });
      const data = await readFlowJson<{
        choices?: { message?: { content?: unknown } }[];
        error?: string | { message?: string };
        message?: string;
      }>(res);
      if (!res.ok) {
        mapFlowHttpError(res.status, data, "抠头像");
        continue;
      }
      const text = extractChatContent(data);
      if (text.trim()) return parseHeadBoxes(text).map((box) => padHeadBox(box));
    } catch {
      /* next model */
    }
  }
  return [{ ...DEFAULT_HEAD_BOX }];
}

export async function detectHeadBox(photoPath: string): Promise<HeadBox> {
  return (await detectHeadBoxes(photoPath))[0] || { ...DEFAULT_HEAD_BOX };
}

export async function cropHead(src: string, dest: string, box: HeadBox): Promise<void> {
  await mkdir(path.dirname(dest), { recursive: true });
  const { x, y, w, h } = clampHeadBox(box);
  const vf = `crop=iw*${w}/100:ih*${h}/100:iw*${x}/100:ih*${y}/100`;
  try {
    await run("ffmpeg", ["-y", "-i", src, "-vf", vf, dest]);
  } catch {
    await copyFile(src, dest);
  }
}

export async function copyAsHead(src: string, dest: string): Promise<void> {
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(src, dest);
}

/** Pixel-only enlarge + light recover. Never redraw, never stack sharpen. */
export const HEAD_UPSCALE_FILTER = [
  "scale='min(1920,iw*3)':'min(1920,ih*3)':force_original_aspect_ratio=decrease:flags=lanczos+accurate_rnd+full_chroma_int",
  "cas=strength=0.28",
].join(",");

export const HEAD_RETOUCH_FALLBACK = [
  "scale='min(1920,iw*3)':'min(1920,ih*3)':force_original_aspect_ratio=decrease:flags=lanczos",
].join(",");

export async function upscaleHead(src: string, dest: string): Promise<void> {
  await mkdir(path.dirname(dest), { recursive: true });
  try {
    await run("ffmpeg", ["-y", "-i", src, "-vf", HEAD_UPSCALE_FILTER, dest]);
  } catch {
    try {
      await run("ffmpeg", ["-y", "-i", src, "-vf", HEAD_RETOUCH_FALLBACK, dest]);
    } catch {
      await copyFile(src, dest);
    }
  }
}
