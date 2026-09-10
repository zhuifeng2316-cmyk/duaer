import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { aspectSize, parseQuality, type Aspect, type OutputQuality } from "../aspect";
import { CINEMA_IDENTITY_LEAD, CINEMA_STILL_LOCK, CINEMA_WARDROBE_LOCK, DEFAULT_CINEMA_LOOK, cinemaPosterCopy, stripBoardLettering } from "../cinema";
import { shotAsksForOthers } from "../cast";
import { generateStillFromRef } from "../ark/image";
import { arkImageEndpoint } from "../ark/config";
import {
  authHeaders,
  getFlowApiKey,
  getFlowBaseUrl,
  getImageModel,
  mapFlowHttpError,
  readFlowJson,
} from "./config";
import { extractChatImage } from "./json";

export { generateStillFromRef } from "../ark/image";
export { arkImageEndpoint } from "../ark/config";

function mimeFromName(name: string): string {
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function fileToDataUrl(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  const mime = mimeFromName(filePath.toLowerCase());
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export function flowImageEndpoint(): string {
  return arkImageEndpoint();
}

export function buildImageGenContent(opts: {
  prompt: string;
  imageDataUrls: string[];
  lead?: string;
}): Array<Record<string, unknown>> {
  const parts: Array<Record<string, unknown>> = [];
  for (const url of opts.imageDataUrls) {
    parts.push({
      type: "image_url",
      image_url: { url, detail: "high" },
    });
  }
  if (opts.lead?.trim()) {
    parts.push({ type: "text", text: opts.lead.trim() });
  }
  parts.push({ type: "text", text: opts.prompt });
  return parts;
}

export function cloneImagePrompt(opts: {
  scene: string;
  aspect: Aspect;
  look?: string;
  imagePrompt?: string;
  onScreenText?: string;
  peopleCount?: number;
  quality?: OutputQuality;
}): string {
  const { width, height } = aspectSize(opts.aspect, parseQuality(opts.quality));
  const look = (opts.look || "").trim() || DEFAULT_CINEMA_LOOK;
  const frame = stripBoardLettering((opts.imagePrompt || opts.scene).trim());
  const people = Math.max(1, opts.peopleCount || 1);
  const extras = shotAsksForOthers(frame);
  const lock =
    people > 1
      ? [
          `上面附图是 ${people} 个不同的人，每人一张头像，从左到右依次对应第 1 到第 ${people} 个人。`,
          `这一镜必须同时出现这 ${people} 个人，每人的脸锁对应那张参考头像：性别、五官、发型、年龄、肤色一致。`,
          "禁止合成一张脸，禁止漏人，禁止改性别，禁止换成别人。",
          extras ? "分镜要求的其他人可以按描述出现，但选定的人必须都在。" : "不要再加没选中的路人、群众或另一张陌生脸。",
        ].join("")
      : extras
        ? [
            "上面附图就是这个人。输出必须能认成同一个人：性别、五官、发型、发色、年龄、体态都按附图来。",
            "照片里是男就是男、是女就是女。不要换人，不要变年轻，不要画成另一个演员。",
            "分镜要求的其他人可以按描述出现，但主角必须是附图这个人。",
            CINEMA_WARDROBE_LOCK,
          ].join("")
        : [
            "上面附图就是这个人。输出必须能认成同一个人：性别、五官、发型、发色、年龄、体态都按附图来。",
            "照片里是男就是男、是女就是女。不要换人，不要变年轻，不要画成另一个演员。",
            "画面里只能出现附图这一个人。不要路人，不要第二张脸，不要背景里清晰的人脸，不要群众，不要配角。",
            CINEMA_WARDROBE_LOCK,
          ].join("");
  return [
    "只生成一张图，不要文字回复。",
    `画幅 ${opts.aspect}，像素 ${width}x${height}。`,
    cinemaPosterCopy(opts.onScreenText),
    lock,
    CINEMA_STILL_LOCK,
    "这是口播短视频的画面：闭口、自然表情，不要对镜头张嘴主持。",
    `场景气质：${look}。必须是电影大片，不是手机自拍或证件照。`,
    `这一镜只改场景和光：${frame}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateCloneStill(opts: {
  scene: string;
  imagePrompt?: string;
  onScreenText?: string;
  look?: string;
  aspect: Aspect;
  photoPaths: string[];
  destPath: string;
  peopleCount?: number;
  quality?: OutputQuality;
}): Promise<void> {
  const quality = parseQuality(opts.quality);
  const photos =
    opts.photoPaths.length === 1 ? [opts.photoPaths[0]!, opts.photoPaths[0]!] : opts.photoPaths;
  await generateStillFromRef({
    prompt: cloneImagePrompt({
      scene: opts.scene,
      aspect: opts.aspect,
      look: opts.look || DEFAULT_CINEMA_LOOK,
      imagePrompt: opts.imagePrompt,
      onScreenText: opts.onScreenText,
      peopleCount: Math.max(1, opts.peopleCount || 1),
      quality,
    }),
    photoPaths: photos,
    destPath: opts.destPath,
    aspect: opts.aspect,
    lead: CINEMA_IDENTITY_LEAD,
    extraBody: { size: quality },
  });
}

async function writeImageRef(dataUrl: string, destPath: string): Promise<void> {
  await mkdir(path.dirname(destPath), { recursive: true });
  if (dataUrl.startsWith("http")) {
    const img = await fetch(dataUrl, { signal: AbortSignal.timeout(60_000) });
    if (!img.ok) throw new Error("封面下载失败");
    await writeFile(destPath, Buffer.from(await img.arrayBuffer()));
    return;
  }
  const m = dataUrl.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
  if (!m) throw new Error("封面没返回图片");
  await writeFile(destPath, Buffer.from(m[1], "base64"));
}

/** 成片封面走 Flow chat 出图，不走方舟静帧口。 */
export async function generateFlowImage(opts: {
  prompt: string;
  destPath: string;
  imageDataUrls?: string[];
  lead?: string;
  aspect?: Aspect;
  quality?: OutputQuality;
}): Promise<void> {
  const apiKey = getFlowApiKey();
  if (!apiKey) throw new Error("还没接上出图通道");
  const content = buildImageGenContent({
    prompt: opts.prompt,
    imageDataUrls: opts.imageDataUrls || [],
    lead: opts.lead,
  });
  const res = await fetch(`${getFlowBaseUrl()}/api/v1/chat/completions`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      model: getImageModel(),
      messages: [{ role: "user", content }],
      generation_config: opts.aspect
        ? { image_config: { aspect_ratio: opts.aspect, image_size: parseQuality(opts.quality) } }
        : undefined,
      extra_body: opts.aspect
        ? { image_config: { aspect_ratio: opts.aspect, image_size: parseQuality(opts.quality) } }
        : undefined,
    }),
    signal: AbortSignal.timeout(180_000),
  });
  const data = await readFlowJson<{
    choices?: { message?: { content?: unknown } }[];
    data?: { url?: string; b64_json?: string; mime_type?: string }[];
    error?: string | { message?: string };
    message?: string;
  }>(res);
  if (!res.ok) throw new Error(mapFlowHttpError(res.status, data, "封面"));
  const image = extractChatImage(data);
  if (!image) throw new Error("封面没返回图片");
  await writeImageRef(image, opts.destPath);
}
