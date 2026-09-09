import { NextResponse } from "next/server";
import { parseFaceLabel } from "@/lib/character";
import { publicTurn, readTurn, updateTurn } from "@/lib/turn-store";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const turn = await readTurn(id);
  if (!turn) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  if (!turn.faces.length) {
    return NextResponse.json({ error: "先抠出头像再起名" }, { status: 400 });
  }
  let body: { faceId?: unknown; name?: unknown };
  try {
    body = (await req.json()) as { faceId?: unknown; name?: unknown };
  } catch {
    return NextResponse.json({ error: "先给这个人起个名字" }, { status: 400 });
  }
  const faceId = String(body.faceId || "").trim();
  const idx = turn.faces.findIndex((f) => f.id === faceId);
  if (idx < 0) return NextResponse.json({ error: "要起名的头像不存在" }, { status: 400 });
  const faces = turn.faces.map((f, i) =>
    i === idx ? { ...f, label: parseFaceLabel(String(body.name || ""), f.label) } : f,
  );
  const saved = await updateTurn(id, { faces });
  return NextResponse.json({ turn: publicTurn(saved) });
}
