import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Aspect } from "../aspect";
import {
  arkImageEndpoint,
  arkStillSize,
  getArkApiKey,
  getArkImageModel,
  mapArkImageError,
} from "./config";

function mimeFromName(name: string): string {
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function fileToDataUrl(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  const mime = mimeFromName(filePath.toLowerCase());
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export function uniqueRefPaths(photoPaths: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of photoPaths) {
    const abs = path.resolve(p);
    if (seen.has(abs)) continue;
    seen.add(abs);
    out.push(p);
  }
  return out.slice(0, 14);
}

export function buildArkStillBody(opts: {
  prompt: string;
  imageDataUrls: string[];
  model: string;
  aspect?: Aspect;
  extraBody?: Record<string, unknown>;
  lead?: string;
}): Record<string, unknown> {
  const images = opts.imageDataUrls.filter(Boolean).slice(0, 14);
  const prompt = [opts.lead?.trim(), opts.prompt.trim()].filter(Boolean).join("\n");
  return {
    model: opts.model,
    prompt,
    image: images.length <= 1 ? images[0] : images,
    size: arkStillSize(opts.aspect, opts.extraBody),
    watermark: false,
    sequential_image_generation: "disabled",
    response_format: "url",
  };
}

function imageFromArk(data: { data?: { url?: string; b64_json?: string }[] }): string | null {
  const first = data.data?.[0];
  if (first?.url) return first.url;
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  return null;
}

export async function generateStillFromRef(opts: {
  prompt: string;
  photoPaths: string[];
  destPath: string;
  models?: string[];
  extraBody?: Record<string, unknown>;
  lead?: string;
  aspect?: Aspect;
}): Promise<void> {
  const apiKey = getArkApiKey();
  if (!apiKey) throw new Error("未配置密钥");

  const photos = uniqueRefPaths(opts.photoPaths);
  if (!photos.length) throw new Error("人物参考图不见了，请重新上传");

  const imageDataUrls: string[] = [];
  for (const p of photos) {
    imageDataUrls.push(await fileToDataUrl(p));
  }

  const models = (opts.models?.length ? opts.models : [getArkImageModel()]).filter(
    (m, i, arr) => arr.indexOf(m) === i,
  );

  let lastError = "出图失败";
  for (const model of models) {
    try {
      const res = await fetch(arkImageEndpoint(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(
          buildArkStillBody({
            prompt: opts.prompt,
            imageDataUrls,
            model,
            aspect: opts.aspect,
            extraBody: opts.extraBody,
            lead: opts.lead,
          }),
        ),
        signal: AbortSignal.timeout(180_000),
      });
      const text = await res.text();
      let data: { data?: { url?: string; b64_json?: string }[]; error?: { message?: string }; message?: string } = {};
      try {
        data = JSON.parse(text) as typeof data;
      } catch {
        lastError = mapArkImageError(res.status);
        continue;
      }
      if (!res.ok) {
        lastError = mapArkImageError(res.status);
        continue;
      }
      const dataUrl = imageFromArk(data);
      if (!dataUrl) {
        lastError = "出图未返回图片";
        continue;
      }
      await mkdir(path.dirname(opts.destPath), { recursive: true });
      if (dataUrl.startsWith("http")) {
        const img = await fetch(dataUrl, { signal: AbortSignal.timeout(60_000) });
        if (!img.ok) throw new Error("下载出图失败");
        await writeFile(opts.destPath, Buffer.from(await img.arrayBuffer()));
      } else {
        const m = dataUrl.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
        if (!m) throw new Error("无法解析出图");
        await writeFile(opts.destPath, Buffer.from(m[1], "base64"));
      }
      return;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(lastError);
}
