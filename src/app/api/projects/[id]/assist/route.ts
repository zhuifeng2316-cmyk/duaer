import { NextResponse } from "next/server";
import { extractCaptionRecommendations, runTalkAssist, type AssistMessage } from "@/lib/talk-assist";
import { readProject } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await readProject(id);
  if (!project) return NextResponse.json({ error: "找不到这条口播" }, { status: 404 });
  let body: { messages?: unknown };
  try {
    body = (await req.json()) as { messages?: unknown };
  } catch {
    return NextResponse.json({ error: "先说一句你想问什么" }, { status: 400 });
  }
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages: AssistMessage[] = raw
    .map((row) => {
      const item = row as { role?: unknown; content?: unknown };
      const role = item.role === "assistant" ? "assistant" : item.role === "user" ? "user" : "";
      const content = String(item.content || "").trim();
      if (!role || !content) return null;
      return { role, content } as AssistMessage;
    })
    .filter((row): row is AssistMessage => Boolean(row))
    .slice(-12);
  if (!messages.length) return NextResponse.json({ error: "先说一句你想问什么" }, { status: 400 });
  try {
    const reply = await runTalkAssist(project, messages);
    return NextResponse.json({
      reply,
      recommendations: extractCaptionRecommendations(reply, project.script?.shots.length || 0),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "助手这次没接上" }, { status: 500 });
  }
}
