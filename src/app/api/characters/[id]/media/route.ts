import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { readCharacter, safeCharacterMediaPath } from "@/lib/character-store";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const character = await readCharacter(id);
  if (!character) return NextResponse.json({ error: "人物不存在" }, { status: 404 });
  const url = new URL(req.url);
  const f = url.searchParams.get("f") || character.head || character.crop;
  const abs = safeCharacterMediaPath(id, f);
  if (!abs) return NextResponse.json({ error: "非法路径" }, { status: 400 });
  try {
    const buf = await readFile(abs);
    const ext = abs.slice(abs.lastIndexOf(".")).toLowerCase();
    return new NextResponse(Uint8Array.from(buf), {
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
}
