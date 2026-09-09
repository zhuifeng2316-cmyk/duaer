import { NextResponse } from "next/server";
import {
  characterHasAllViews,
  isCharacterBusy,
  startExpandCharacter,
} from "@/lib/character-pipeline";
import { publicCharacterDetail, readCharacter, saveCharacter } from "@/lib/character-store";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const character = await readCharacter(id);
  if (!character) return NextResponse.json({ error: "人物不存在" }, { status: 404 });
  if (!character.crop) return NextResponse.json({ error: "这个人还没有头像" }, { status: 400 });
  if (characterHasAllViews(character)) {
    return NextResponse.json({ error: "八个方位已经齐了" }, { status: 400 });
  }
  if (isCharacterBusy(id) || character.status === "expanding" || character.status === "rerunning") {
    return NextResponse.json({ error: "正在出图，稍后再试" }, { status: 400 });
  }
  const saved = await saveCharacter({
    ...character,
    status: "expanding",
    progress: 8,
    message: "在出八个方位…",
    error: null,
    regenViewId: null,
  });
  startExpandCharacter(id);
  return NextResponse.json({ character: publicCharacterDetail(saved) });
}
