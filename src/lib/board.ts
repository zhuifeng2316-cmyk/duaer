export const DURATION_PRESETS = [15, 30, 60] as const;

export function parseDurationSec(raw: string | null | undefined): number {
  const n = Number(String(raw || "").trim());
  if (!Number.isFinite(n) || n <= 0) return 15;
  return Math.min(60, Math.max(8, Math.round(n)));
}

/** 目标时长只是预算：镜数按文案来，这里只给上下限。 */
export function planBoard(targetSec: number): { durationSec: number; minCount: number; maxCount: number } {
  const durationSec = parseDurationSec(String(targetSec));
  const minCount = 2;
  const maxCount = Math.min(12, Math.max(4, Math.round(durationSec / 2.5)));
  return { durationSec, minCount, maxCount };
}
