import { readFile } from "fs/promises";
import {
  authHeaders,
  getFlowApiKey,
  getFlowBaseUrl,
  getScriptModel,
  getTextModel,
  mapFlowHttpError,
  readFlowJson,
} from "./flow/config";
import { extractChatContent } from "./flow/json";

export const SUBJECT_DESCRIBE_PROMPT = [
  "如实描述这张头像里的脸，用来锁身份。不要创作，不要美化，不要脑补成另一个人。",
  "必须写明可见的性别（男性 / 女性 / 儿童；看不清就写看不清，禁止默认写成女性）。",
  "再写年龄段、发型发色发际线、脸型、眼距、眉形、鼻梁、嘴唇厚薄、肤色、痣斑疤、是否戴眼镜。",
  "只写看得见的辨识特征，不要写衣服，不要根据服装判断身份。一段连续中文，不超过 160 字。",
].join("");

function mimeFromName(name: string): string {
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function fileToDataUrl(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  return `data:${mimeFromName(filePath.toLowerCase())};base64,${buf.toString("base64")}`;
}

function tokenField(model: string, maxTokens: number): Record<string, number> {
  if (/^(gpt-|o\d)/i.test(model)) return { max_completion_tokens: maxTokens };
  return { max_tokens: maxTokens };
}

export function cleanSubjectDescription(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 240);
}

export async function describeSubjectFromPhoto(photoPath: string): Promise<string> {
  const apiKey = getFlowApiKey();
  if (!apiKey) throw new Error("未配置密钥");

  const dataUrl = await fileToDataUrl(photoPath);
  const models = [getScriptModel(), getTextModel()].filter((m, i, arr) => arr.indexOf(m) === i);
  let lastError = "没认出照片里的人";

  for (const model of models) {
    try {
      const res = await fetch(`${getFlowBaseUrl()}/api/v1/chat/completions`, {
        method: "POST",
        headers: authHeaders(apiKey),
        body: JSON.stringify({
          model,
          temperature: 0.1,
          ...tokenField(model, 400),
          messages: [
            { role: "system", content: "你只如实描述这张头像的脸，不写衣服，不创作，不改性别。" },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
                { type: "text", text: SUBJECT_DESCRIBE_PROMPT },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(60_000),
      });
      const data = await readFlowJson<{
        choices?: { message?: { content?: unknown } }[];
        error?: string | { message?: string };
        message?: string;
      }>(res);
      if (!res.ok) {
        lastError = mapFlowHttpError(res.status, data, "认人");
        continue;
      }
      const text = cleanSubjectDescription(extractChatContent(data));
      if (text.length >= 8) return text;
      lastError = "没认出照片里的人";
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(lastError);
}
