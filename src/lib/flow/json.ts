function stripFence(raw: string): string {
  let text = raw.trim().replace(/^\uFEFF/, "");
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/m, "").trim();
  }
  return text;
}

function sliceBalancedObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!;
    if (inStr) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function repairJson(text: string): string {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

export function extractJsonObject(raw: string): unknown {
  const stripped = stripFence(raw);
  const sliced = sliceBalancedObject(stripped) || stripped;
  for (const text of [sliced, repairJson(sliced)]) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      /* next */
    }
  }
  throw new Error("文案没写成能用的稿，请再试一次");
}

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join("\n");
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return asText(o.text ?? o.content ?? o.value ?? "");
  }
  return "";
}

export function extractChatContent(data: {
  choices?: { message?: { content?: unknown }; delta?: { content?: unknown }; text?: unknown }[];
  output_text?: unknown;
}): string {
  const choice = data.choices?.[0];
  const primary = asText(choice?.message?.content).trim();
  if (primary) return primary;
  const delta = asText(choice?.delta?.content);
  if (delta) return delta;
  const choiceText = asText(choice?.text).trim();
  if (choiceText) return choiceText;
  return asText(data.output_text).trim();
}

export function extractStreamDelta(raw: string): string {
  const line = raw.trim();
  if (!line || line === "[DONE]") return "";
  const payload = line.startsWith("data:") ? line.slice(5).trim() : line;
  if (!payload || payload === "[DONE]") return "";
  try {
    const data = JSON.parse(payload) as {
      choices?: { delta?: { content?: unknown }; message?: { content?: unknown } }[];
    };
    return extractChatContent(data);
  } catch {
    return "";
  }
}

export function extractImageDataUrl(content: unknown): string | null {
  if (!content) return null;
  if (typeof content === "string") {
    const m = content.match(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=\s]+/);
    return m ? m[0].replace(/\s+/g, "") : content.startsWith("http") ? content : null;
  }
  if (Array.isArray(content)) {
    for (const part of content) {
      const found = extractImageDataUrl(part);
      if (found) return found;
    }
    return null;
  }
  if (typeof content === "object") {
    const o = content as { image_url?: { url?: string } | string; url?: string };
    const url = typeof o.image_url === "string" ? o.image_url : o.image_url?.url || o.url;
    if (url?.startsWith("data:image") || url?.startsWith("http")) return url;
  }
  return null;
}
