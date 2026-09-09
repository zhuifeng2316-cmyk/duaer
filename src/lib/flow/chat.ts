import {
  authHeaders,
  getFlowApiKey,
  getFlowBaseUrl,
  getTextModel,
  mapFlowHttpError,
  readFlowJson,
} from "./config";
import { extractChatContent, extractJsonObject } from "./json";

export async function flowChat(params: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  kind?: string;
  expectJson?: boolean;
}): Promise<string> {
  const apiKey = getFlowApiKey();
  if (!apiKey) throw new Error("未配置密钥");
  const model = (params.model || getTextModel()).trim();
  const kind = params.kind || "文案";
  const body: Record<string, unknown> = {
    model,
    temperature: params.temperature ?? 0.7,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
  };
  if (/^(gpt-|o\d)/i.test(model)) body.max_completion_tokens = params.maxTokens ?? 2500;
  else body.max_tokens = params.maxTokens ?? 2500;

  const res = await fetch(`${getFlowBaseUrl()}/api/v1/chat/completions`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const data = await readFlowJson<{
    choices?: { message?: { content?: unknown } }[];
    error?: string | { message?: string };
    message?: string;
  }>(res);
  if (!res.ok) throw new Error(mapFlowHttpError(res.status, data, kind));
  const content = extractChatContent(data);
  if (!content) throw new Error(`${kind}没写出内容，请再试一次`);
  if (params.expectJson !== false) extractJsonObject(content);
  return content;
}
