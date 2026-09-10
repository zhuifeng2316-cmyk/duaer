import path from "path";
import { NextResponse } from "next/server";
import { mediaFileResponse } from "@/lib/media-range";
import { ensureHousePreview } from "@/lib/house-preview";
import { isHouseVoiceId } from "@/lib/house-voices";
import { readVoice, safeVoiceMediaPath } from "@/lib/voice-store";

const MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".webm": "audio/webm",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".aiff": "audio/aiff",
};

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (isHouseVoiceId(id)) {
    try {
      const abs = await ensureHousePreview(id);
      const ext = path.extname(abs).toLowerCase();
      return await mediaFileResponse(abs, req, MIME[ext] || "audio/wav", "private, max-age=86400");
    } catch {
      return NextResponse.json({ error: "这条暂时听不了" }, { status: 503 });
    }
  }
  const voice = await readVoice(id);
  if (!voice) return NextResponse.json({ error: "音色不存在" }, { status: 404 });
  const abs = safeVoiceMediaPath(id, voice.sample);
  if (!abs) return NextResponse.json({ error: "非法路径" }, { status: 400 });
  try {
    const ext = abs.slice(abs.lastIndexOf(".")).toLowerCase();
    return await mediaFileResponse(abs, req, MIME[ext] || "audio/mpeg");
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
}
