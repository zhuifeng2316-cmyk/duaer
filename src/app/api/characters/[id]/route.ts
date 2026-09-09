import { NextResponse } from "next/server";
import { publicCharacterDetail, readCharacter, renameCharacter } from "@/lib/character-store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const character = await readCharacter(id);
  if (!character) return NextResponse.json({ error: "人物不存在" }, { status: 404 });
  return NextResponse.json({ character: publicCharacterDetail(character) });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const character = await readCharacter(id);
  if (!character) return NextResponse.json({ error: "人物不存在" }, { status: 404 });
  let body: { name?: unknown };
  try {
    body = (await req.json()) as { name?: unknown };
  } catch {
    return NextResponse.json({ error: "先给这个人起个名字" }, { status: 400 });
  }
  const saved = await renameCharacter(id, String(body.name || ""));
  return NextResponse.json({ character: publicCharacterDetail(saved) });
}
