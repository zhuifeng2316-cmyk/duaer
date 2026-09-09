import type { Aspect } from "../aspect";

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

export const ARK_STILL_SIZE: Record<Aspect, string> = {
  "9:16": "1440x2560",
  "1:1": "2048x2048",
  "16:9": "2560x1440",
};

export function arkStillSize(aspect?: Aspect, extraBody?: Record<string, unknown>): string {
  if (aspect && ARK_STILL_SIZE[aspect]) return ARK_STILL_SIZE[aspect];
  const size = extraBody?.size;
  if (typeof size === "string" && size.trim()) return size.trim();
  return ARK_STILL_SIZE["9:16"];
}

export function mapArkImageError(status: number): string {
  if (status === 401) return "密钥无效";
  if (status === 402) return "出图余额不足，请充值后再试";
  if (status === 403) return "当前出图能力未开放";
  return "出图失败";
}
