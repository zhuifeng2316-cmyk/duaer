/** How many people the stills should contain, not how many reference files we have. */
export function projectPeopleCount(characterIds?: string[] | null): number {
  return Math.max(1, characterIds?.length || 0);
}

const FORBID_OTHERS =
  /(不要|别|没有|禁止|别写|勿).{0,8}(别人|他人|路人|群众|同事|第二张脸|另一张脸|其他人)/;

const ASK_OTHERS =
  /(别人|他人|路人|同事|朋友|伴侣|人群|群众|配角|另一[个位人张]|第二个人|两个人|两人同框|三人|旁边的人|一群人|围观)/;

/** True when this shot's text actually asks for extra people, not when it forbids them. */
export function shotAsksForOthers(text: string): boolean {
  const t = (text || "").replace(/\s+/g, "");
  if (!t) return false;
  if (FORBID_OTHERS.test(t)) return false;
  return ASK_OTHERS.test(t);
}
