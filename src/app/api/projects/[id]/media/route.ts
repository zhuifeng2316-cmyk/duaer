import { NextResponse } from "next/server";
import { mediaFileResponse } from "@/lib/media-range";
import { safeMediaPath } from "@/lib/media-path";
import { readProject } from "@/lib/store";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".html": "text/html; charset=utf-8",
};

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await readProject(id);
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  const url = new URL(req.url);
  const f = url.searchParams.get("f") || "";
  const abs = safeMediaPath(id, f);
  if (!abs) return NextResponse.json({ error: "非法路径" }, { status: 400 });
  try {
    const ext = abs.slice(abs.lastIndexOf(".")).toLowerCase();
    return await mediaFileResponse(abs, req, MIME[ext] || "application/octet-stream");
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
}
