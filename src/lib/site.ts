export const DEFAULT_SITE_URL = "https://www.duaer.com";

export function getSiteUrl(): string {
  const raw = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  const url = (raw || DEFAULT_SITE_URL).replace(/\/+$/, "");
  try {
    const parsed = new URL(url.includes("://") ? url : `https://${url}`);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return DEFAULT_SITE_URL;
  }
}
