import { NextResponse } from "next/server";
import { publicCharacterDetail, readCharacter } from "@/lib/character-store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const character = await readCharacter(id);
  if (!character) return NextResponse.json({ error: "人物不存在" }, { status: 404 });
  return NextResponse.json({ character: publicCharacterDetail(character) });
}
