import { NextResponse } from "next/server";
import { assertPhoto, extForMime } from "@/lib/photos";
import { startCut } from "@/lib/turn-pipeline";
import { createTurn, publicTurn, updateTurn, writeTurnFile } from "@/lib/turn-store";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const photo = form.get("photo");
    if (!(photo instanceof File) || photo.size === 0) {
      return NextResponse.json({ error: "先上传一张人物照片" }, { status: 400 });
    }
    assertPhoto(photo);
    const turn = await createTurn();
    const source = `source.${extForMime(photo.type)}`;
    await writeTurnFile(turn.id, source, Buffer.from(await photo.arrayBuffer()));
    const saved = await updateTurn(turn.id, { source, status: "queued", message: "开始抠头像" });
    startCut(turn.id);
    return NextResponse.json({ turn: publicTurn(saved) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "创建失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
