import {
  authHeaders,
  getFlowApiKey,
  getFlowBaseUrl,
  getTextModel,
  mapFlowHttpError,
  readFlowJson,
} from "./config";
import { extractChatContent, extractJsonObject, extractStreamDelta } from "./json";

type ChatParams = {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  kind?: string;
  expectJson?: boolean;
};

function chatBody(params: ChatParams, stream: boolean): Record<string, unknown> {
  const model = (params.model || getTextModel()).trim();
  const body: Record<string, unknown> = {
    model,
    temperature: params.temperature ?? 0.7,
    stream,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
  };
  if (/^(gpt-|o\d)/i.test(model)) body.max_completion_tokens = params.maxTokens ?? 2500;
  else body.max_tokens = params.maxTokens ?? 2500;
  return body;
}

export async function flowChat(params: ChatParams): Promise<string> {
  const apiKey = getFlowApiKey();
  if (!apiKey) throw new Error("未配置密钥");
  const kind = params.kind || "文案";
  const res = await fetch(`${getFlowBaseUrl()}/api/v1/chat/completions`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify(chatBody(params, false)),
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

export async function flowChatStream(
  params: ChatParams & { onDelta?: (fullText: string) => void | Promise<void> },
): Promise<string> {
  const apiKey = getFlowApiKey();
  if (!apiKey) throw new Error("未配置密钥");
  const kind = params.kind || "文案";
  const res = await fetch(`${getFlowBaseUrl()}/api/v1/chat/completions`, {
    method: "POST",
    headers: {
      ...authHeaders(apiKey),
      Accept: "text/event-stream, application/json",
    },
    body: JSON.stringify(chatBody(params, true)),
    signal: AbortSignal.timeout(180_000),
  });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    if (ct.includes("json")) {
      const data = await readFlowJson<{ error?: string | { message?: string }; message?: string }>(res);
      throw new Error(mapFlowHttpError(res.status, data, kind));
    }
    throw new Error(mapFlowHttpError(res.status, undefined, kind));
  }
  if (!res.body || (ct.includes("json") && !ct.includes("event-stream"))) {
    const data = await readFlowJson<{ choices?: { message?: { content?: unknown } }[] }>(res);
    const content = extractChatContent(data);
    if (content) await params.onDelta?.(content);
    if (!content) throw new Error(`${kind}没写出内容，请再试一次`);
    if (params.expectJson !== false) extractJsonObject(content);
    return content;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const piece = extractStreamDelta(line);
      if (!piece) continue;
      full += piece;
      await params.onDelta?.(full);
    }
  }
  const tail = extractStreamDelta(buffer);
  if (tail) {
    full += tail;
    await params.onDelta?.(full);
  }
  if (!full.trim()) {
    return flowChat(params);
  }
  if (params.expectJson !== false) extractJsonObject(full);
  return full;
}
