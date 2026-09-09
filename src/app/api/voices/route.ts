import { NextResponse } from "next/server";
import { assertVoice, extForVoiceMime, parseVoiceName } from "@/lib/voice";
import { createVoice, listVoices, publicVoice, readVoiceMeta } from "@/lib/voice-store";

export async function GET() {
  const voices = await listVoices();
  const meta = await readVoiceMeta();
  return NextResponse.json({
    voices: voices.map(publicVoice),
    lastVoiceId: meta.lastVoiceId,
  });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("voice");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "先上传一段说话录音" }, { status: 400 });
    }
    assertVoice(file);
    const voice = await createVoice({
      name: parseVoiceName(String(form.get("name") || "")),
      data: Buffer.from(await file.arrayBuffer()),
      ext: extForVoiceMime(file.type || file.name),
    });
    return NextResponse.json({ voice: publicVoice(voice) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
