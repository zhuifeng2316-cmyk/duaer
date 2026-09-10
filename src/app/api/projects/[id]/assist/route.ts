import { NextResponse } from "next/server";
import { extractCaptionRecommendations, extractGraphicRecommendations, runTalkAssist, type AssistMessage } from "@/lib/talk-assist";
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
    const shotCount = project.script?.shots.length || 0;
    const lastUser = [...messages].reverse().find((row) => row.role === "user")?.content || "";
    const askGraphic = /组件|画面块|叠层|特效层|转场/.test(lastUser);
    const askCaption = /字幕|口播字|电影字|特效字|气质条|动效字|片卡字/.test(lastUser);
    let graphics = extractGraphicRecommendations(reply, shotCount);
    let recommendations = extractCaptionRecommendations(reply, shotCount);
    if (askGraphic && !askCaption) recommendations = [];
    if (askCaption && !askGraphic) graphics = [];
    if (graphics.length && recommendations.length) {
      const graphicLabels = new Set(graphics.map((row) => row.label));
      recommendations = recommendations.filter(
        (row) => !graphicLabels.has(row.label) && ![...graphicLabels].some((label) => label.includes(row.label)),
      );
    }
    return NextResponse.json({
      reply,
      recommendations,
      graphics,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "助手这次没接上" }, { status: 500 });
  }
}
