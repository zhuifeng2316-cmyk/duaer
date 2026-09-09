export const MAX_CHARACTERS = 12;
export const CHARACTER_NAME_MAX = 16;

export function parseCharacterName(raw: string, fallback = "人物"): string {
  const name = raw.trim().replace(/\s+/g, " ").slice(0, CHARACTER_NAME_MAX);
  return name || fallback;
}

export function parseFaceLabel(raw: string, current: string): string {
  const name = raw.trim().replace(/\s+/g, " ").slice(0, CHARACTER_NAME_MAX);
  return name || current;
}

export function isDefaultFaceLabel(label: string): boolean {
  return /^头像\s*\d+$/.test(label.trim());
}
