export function durationForVoiceover(text: string): number {
  const n = text.replace(/\s/g, "").length;
  return Math.round(Math.min(6, Math.max(2, n / 4.2 + 0.35)) * 10) / 10;
}

export function spokenLine(shot: { voiceover?: string; onScreenText?: string }): string {
  return (shot.voiceover || shot.onScreenText || "").replace(/\s+/g, " ").trim();
}

function compactSpoken(text: string): string {
  return text
    .replace(/\s+/g, "")
    .replace(/[「」『』《》〈〉""'']+/g, "")
    .replace(/[，。！？、：；…—,.!?;:]+/g, "")
    .trim();
}

export function spokenOverlap(a: string, b: string): boolean {
  const left = compactSpoken(a);
  const right = compactSpoken(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function joinSpoken(head: string, rest: string): string {
  if (!head) return rest;
  if (!rest) return head;
  if (spokenOverlap(head, rest)) return rest.length >= head.length ? rest : head;
  const left = head.replace(/[。.!！]+$/g, "");
  return `${left}。${rest}`;
}

export function spokenShotLine(
  script: { hook?: string; cta?: string; shots: Array<{ voiceover?: string; onScreenText?: string }> },
  index: number,
): string {
  const shot = script.shots[index];
  if (!shot) return "";
  let line = spokenLine(shot);
  if (index === 0) line = joinSpoken(String(script.hook || "").trim(), line);
  if (index === script.shots.length - 1) line = joinSpoken(line, String(script.cta || "").trim());
  return line.replace(/\s+/g, " ").trim();
}
