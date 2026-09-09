export const DURATION_PRESETS = [15, 30, 60] as const;

export function parseDurationSec(raw: string | null | undefined): number {
  const n = Number(String(raw || "").trim());
  if (!Number.isFinite(n) || n <= 0) return 15;
  return Math.min(60, Math.max(8, Math.round(n)));
}

/** 按成片时长排图片分镜：大约 3 秒一镜，3–12 镜。 */
export function planBoard(targetSec: number): { durationSec: number; count: number; each: number } {
  const durationSec = parseDurationSec(String(targetSec));
  const count = Math.min(12, Math.max(3, Math.round(durationSec / 3)));
  const each = Math.round((durationSec / count) * 10) / 10;
  return { durationSec, count, each };
}
