import { readFile } from "fs/promises";
import type { Aspect } from "../aspect";
import { ASPECT_SIZE } from "../aspect";
import { CINEMA_IDENTITY_LEAD, CINEMA_STILL_LOCK, CINEMA_WARDROBE_LOCK } from "../cinema";
import { shotAsksForOthers } from "../cast";
import { generateStillFromRef } from "../ark/image";
import { arkImageEndpoint } from "../ark/config";

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
  peopleCount?: number;
}): string {
  const { width, height } = ASPECT_SIZE[opts.aspect];
  const look = (opts.look || "").trim();
  const frame = (opts.imagePrompt || opts.scene).trim();
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
    `画幅 ${opts.aspect}，像素 ${width}x${height}，无水印、画面上不要字。`,
    lock,
    CINEMA_STILL_LOCK,
    "这是口播短视频的画面：闭口、自然表情，不要对镜头张嘴主持。",
    look ? `场景气质：${look}` : "",
    `这一镜只改场景和光：${frame}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateCloneStill(opts: {
  scene: string;
  imagePrompt?: string;
  look?: string;
  aspect: Aspect;
  photoPaths: string[];
  destPath: string;
  peopleCount?: number;
}): Promise<void> {
  const photos =
    opts.photoPaths.length === 1 ? [opts.photoPaths[0]!, opts.photoPaths[0]!] : opts.photoPaths;
  await generateStillFromRef({
    prompt: cloneImagePrompt({
      scene: opts.scene,
      aspect: opts.aspect,
      look: opts.look,
      imagePrompt: opts.imagePrompt,
      peopleCount: Math.max(1, opts.peopleCount || 1),
    }),
    photoPaths: photos,
    destPath: opts.destPath,
    aspect: opts.aspect,
    lead: CINEMA_IDENTITY_LEAD,
    extraBody: { size: "2K" },
  });
}
