import { NextResponse } from "next/server";
import { rewriteCinemaHtml } from "@/lib/cinema-render";
import { resolveHouseByLabel } from "@/lib/talk-assist-shared";
import { applyHouseLabelToShot, applyHouseLabelToShots } from "@/lib/hf-pick";
import { shotNeedsPersonStill } from "@/lib/graphic-board";
import { isProduceBusy, startRegenStill } from "@/lib/pipeline";
import { readProject, updateProject } from "@/lib/store";
import { publicProject } from "@/lib/types";

function canEditGraphic(status: string, phase: string): boolean {
  if (status === "ready") return true;
  if (status === "review" && (phase === "board" || phase === "images")) return true;
  return false;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await readProject(id);
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  if (!project.script?.shots.length) return NextResponse.json({ error: "先把故事分镜写好" }, { status: 400 });
  if (isProduceBusy(id)) return NextResponse.json({ error: "正在出片，稍后再改" }, { status: 400 });
  if (!canEditGraphic(project.status, project.phase)) {
    return NextResponse.json({ error: "故事分镜写好后才能改组件" }, { status: 400 });
  }

  let body: { label?: unknown; shotIndex?: unknown };
  try {
    body = (await req.json()) as { label?: unknown; shotIndex?: unknown };
  } catch {
    return NextResponse.json({ error: "先选组件" }, { status: 400 });
  }
  const label = String(body.label || "").trim();
  const house = resolveHouseByLabel(label);
  if (!house) return NextResponse.json({ error: "没有这种组件" }, { status: 400 });

  const shotIndex = body.shotIndex == null || body.shotIndex === "" ? undefined : Number(body.shotIndex);
  if (shotIndex != null && (!Number.isInteger(shotIndex) || !project.script.shots[shotIndex])) {
    return NextResponse.json({ error: "这一镜不在" }, { status: 400 });
  }

  const before = project.script;
  const script =
    shotIndex == null
      ? applyHouseLabelToShots(before, house.label, project.aspect)
      : applyHouseLabelToShot(before, shotIndex, house.label, project.aspect);

  const changed =
    shotIndex == null
      ? script.shots.some((shot, i) => shot.graphicIntent !== before.shots[i]?.graphicIntent || shot.overlay !== before.shots[i]?.overlay || shot.block !== before.shots[i]?.block)
      : script.shots[shotIndex!]?.overlay !== before.shots[shotIndex!]?.overlay ||
        script.shots[shotIndex!]?.block !== before.shots[shotIndex!]?.block ||
        script.shots[shotIndex!]?.graphicIntent !== before.shots[shotIndex!]?.graphicIntent;
  if (!changed) {
    return NextResponse.json({ error: "这个组件和当前画幅挂不上" }, { status: 400 });
  }

  const stills = project.stills.slice();
  while (stills.length < script.shots.length) stills.push("");
  const regen: number[] = [];
  for (let i = 0; i < script.shots.length; i++) {
    if (shotIndex != null && i !== shotIndex) continue;
    const shot = script.shots[i]!;
    // Keep existing person stills for the wall preview. Host cinema paths already
    // skip them via shotNeedsPersonStill — wiping here left "04 组件" empty cards
    // when recipe/aspect later stripped the wrap.
    if (shotNeedsPersonStill(shot) && !stills[i] && (project.phase === "images" || project.status === "ready")) {
      regen.push(i);
    }
  }

  const saved = await updateProject(id, {
    script,
    stills,
    ...(regen.length ? { regenShotIndex: regen[0], message: `正在出镜 ${regen[0]! + 1}的画面…` } : {}),
  });
  if (saved.htmlPath) {
    try {
      await rewriteCinemaHtml(id);
    } catch {
      /* 下次再出片会按分镜重写 */
    }
  }
  for (const i of regen) startRegenStill(id, i);
  return NextResponse.json({ project: publicProject(saved) });
}
