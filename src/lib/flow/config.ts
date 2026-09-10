export function getFlowApiKey(): string {
  return (process.env.FLOW_API_KEY || "").trim();
}

export function getFlowBaseUrl(): string {
  return (process.env.FLOW_API_BASE || "https://flow.dianwu.ai").replace(/\/$/, "");
}

export function getTextModel(): string {
  return (process.env.TEXT_MODEL || "deepseek-v4-pro").trim();
}

/** 口播页左侧助手：默认 deepseek-chat，C 端不写模型名 */
export function getTalkChatModel(): string {
  return (process.env.TALK_CHAT_MODEL || "deepseek-chat").trim();
}

/** 文案 + 图片分镜：默认 Astra */
export function getScriptModel(): string {
  return (process.env.SCRIPT_MODEL || "gpt-6-astra").trim();
}

export function getImageModel(): string {
  return (process.env.IMAGE_MODEL || "gemini-3-pro-image").trim();
}

/** 头像高清不走此模型：修原图，避免出图重绘换人。保留给以后真正的修图通道。 */
export function getEnhanceImageModel(): string {
  return (process.env.ENHANCE_IMAGE_MODEL || getImageModel() || "gemini-3-pro-image").trim();
}

export function getMusicModel(): string {
  return (process.env.MUSIC_MODEL || "suno-v5-5").trim();
}

export function isFlowMock(): boolean {
  return (process.env.FLOW_MOCK || "").trim() === "1";
}

export function authHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export function mapFlowHttpError(
  status: number,
  data?: { message?: string; error?: string | { message?: string } },
  kind = "生成",
): string {
  if (status === 401) return "密钥无效";
  if (status === 402) return `${kind}余额不足，请充值后再试`;
  if (status === 403) return `当前${kind}能力未开放`;
  const err = data?.error;
  const msg = (typeof err === "string" ? err : err?.message) || data?.message;
  return msg || `${kind}失败（HTTP ${status}）`;
}

export async function readFlowJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`通道返回非 JSON（HTTP ${res.status}）`);
  }
}
