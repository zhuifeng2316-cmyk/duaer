import { NextResponse } from "next/server";
import { applyFaceSelection, headFromFaces, publicTurn, readTurn, updateTurn } from "@/lib/turn-store";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const turn = await readTurn(id);
  if (!turn) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  if (turn.status !== "review") {
    return NextResponse.json({ error: "现在不能改选人" }, { status: 400 });
  }
  let body: { selected?: unknown };
  try {
    body = (await req.json()) as { selected?: unknown };
  } catch {
    return NextResponse.json({ error: "先点选要用的头像" }, { status: 400 });
  }
  const ids = Array.isArray(body.selected) ? body.selected.map((x) => String(x)) : [];
  const known = new Set(turn.faces.map((f) => f.id));
  if (turn.faces.length && ids.some((x) => !known.has(x))) {
    return NextResponse.json({ error: "选中的头像不存在" }, { status: 400 });
  }
  const faces = applyFaceSelection(turn, ids);
  const sync = headFromFaces(faces);
  const saved = await updateTurn(id, {
    faces,
    head: sync.head,
    crop: sync.crop,
    enhanced: sync.enhanced,
  });
  return NextResponse.json({ turn: publicTurn(saved) });
}
