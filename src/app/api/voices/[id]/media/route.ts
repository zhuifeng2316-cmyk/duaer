import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { readVoice, safeVoiceMediaPath } from "@/lib/voice-store";

const MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".webm": "audio/webm",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const voice = await readVoice(id);
  if (!voice) return NextResponse.json({ error: "音色不存在" }, { status: 404 });
  const abs = safeVoiceMediaPath(id, voice.sample);
  if (!abs) return NextResponse.json({ error: "非法路径" }, { status: 400 });
  try {
    const buf = await readFile(abs);
    const ext = abs.slice(abs.lastIndexOf(".")).toLowerCase();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": MIME[ext] || "audio/mpeg",
        "Content-Length": String(buf.byteLength),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
}
