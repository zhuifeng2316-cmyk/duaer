export function durationForVoiceover(text: string): number {
  const n = text.replace(/\s/g, "").length;
  return Math.round(Math.min(6, Math.max(2, n / 4.2 + 0.35)) * 10) / 10;
}

export function spokenLine(shot: { voiceover?: string; onScreenText?: string }): string {
  return (shot.voiceover || shot.onScreenText || "").replace(/\s+/g, " ").trim();
}
