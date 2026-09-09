import { NextResponse } from "next/server";
import { parseCharacterName } from "@/lib/character";
import { createCharactersFromTurn, listCharacters, publicCharacter, readCharacterMeta } from "@/lib/character-store";
import { readTurn } from "@/lib/turn-store";

export async function GET() {
  const characters = await listCharacters();
  const meta = await readCharacterMeta();
  return NextResponse.json({
    characters: characters.map(publicCharacter),
    lastCharacterIds: meta.lastCharacterIds,
  });
}

export async function POST(req: Request) {
  try {
    let body: { turnId?: unknown; name?: unknown };
    try {
      body = (await req.json()) as { turnId?: unknown; name?: unknown };
    } catch {
      return NextResponse.json({ error: "先抠出头像再保存人物" }, { status: 400 });
    }
    const turnId = String(body.turnId || "").trim();
    const turn = await readTurn(turnId);
    if (!turn) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    if (!turn.faces.length && !turn.head) {
      return NextResponse.json({ error: "先抠出头像再保存人物" }, { status: 400 });
    }
    const name = typeof body.name === "string" ? parseCharacterName(body.name, "") : "";
    const rows = await createCharactersFromTurn(turn, name || undefined);
    return NextResponse.json({
      characters: rows.map(publicCharacter),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
