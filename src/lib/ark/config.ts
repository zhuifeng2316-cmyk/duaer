import { aspectSize, parseQuality, type Aspect } from "../aspect";

export function getArkApiKey(): string {
  return (process.env.ARK_API_KEY || "").trim();
}

export function getArkBaseUrl(): string {
  return (process.env.ARK_API_BASE || "https://ark.cn-beijing.volces.com").replace(/\/$/, "");
}

export function getArkImageModel(): string {
  return (process.env.ARK_IMAGE_MODEL || "doubao-seedream-4-5-251128").trim();
}

export function arkImageEndpoint(): string {
  return `${getArkBaseUrl()}/api/v3/images/generations`;
}

export function arkStillSize(aspect?: Aspect, extraBody?: Record<string, unknown>): string {
  const raw = typeof extraBody?.size === "string" ? extraBody.size.trim() : "";
  const quality = parseQuality(raw);
  if (aspect) {
    const { width, height } = aspectSize(aspect, quality);
    return `${width}x${height}`;
  }
  if (/^\d+x\d+$/.test(raw)) return raw;
  const fallback = aspectSize("9:16", quality);
  return `${fallback.width}x${fallback.height}`;
}

export function mapArkImageError(status: number): string {
  if (status === 401) return "密钥无效";
  if (status === 402) return "出图余额不足，请充值后再试";
  if (status === 403) return "当前出图能力未开放";
  return "出图失败";
}
