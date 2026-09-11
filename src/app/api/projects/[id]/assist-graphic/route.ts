import { NextResponse } from "next/server";
import { rewriteCinemaHtml } from "@/lib/cinema-render";
import { resolveHouseByLabel } from "@/lib/talk-assist-shared";
import { applyHouseLabelToShot, applyHouseLabelToShots } from "@/lib/hf-pick";
import { shotNeedsPersonStill } from "@/lib/graphic-board";
import { isProduceBusy, startRegenStill } from "@/lib/pipeline";
import { readProject, updateProject } from "@/lib/store";
import { publicProject, type Shot } from "@/lib/types";

function canEditGraphic(status: string, phase: string): boolean {
  if (status === "ready") return true;
  if (status === "review" && (phase === "board" || phase === "images")) return true;
  return false;
}

function shotHasHouse(shot: Shot | undefined, house: { label: string; wraps: string }): boolean {
  if (!shot) return false;
  return (
    shot.graphicIntent === house.label ||
    shot.overlay === house.wraps ||
    shot.block === house.wraps ||
    shot.captionStyle === house.wraps
  );
}

function shotGraphicSig(shot: Shot | undefined): string {
  if (!shot) return "";
  return [shot.graphicIntent || "", shot.overlay || "", shot.block || "", shot.captionStyle || "", shot.graphicLock ? "1" : "0"].join("|");
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

  const targets =
    shotIndex == null ? script.shots.map((_, i) => i) : [shotIndex];
  const changed = targets.some((i) => shotGraphicSig(script.shots[i]) !== shotGraphicSig(before.shots[i]));
  if (!changed) {
    if (targets.every((i) => shotHasHouse(before.shots[i], house))) {
      return NextResponse.json({
        project: publicProject(project),
        note: shotIndex == null ? "各镜已经是这个组件了" : `镜${shotIndex + 1}已经是这个组件了`,
      });
    }
    return NextResponse.json({ error: "这个组件和当前画幅挂不上" }, { status: 400 });
  }

  const stills = project.stills.slice();
  while (stills.length < script.shots.length) stills.push("");
  const regen: number[] = [];
  for (let i = 0; i < script.shots.length; i++) {
    if (shotIndex != null && i !== shotIndex) continue;
    const shot = script.shots[i]!;
    if (shotNeedsPersonStill(shot) && !stills[i] && (project.phase === "images" || project.status === "ready")) {
      regen.push(i);
    }
  }

  await updateProject(id, {
    script,
    stills,
    ...(regen.length ? { regenShotIndex: regen[0], message: `正在出镜 ${regen[0]! + 1}的画面…` } : {}),
  });
  if (project.htmlPath) {
    try {
      await rewriteCinemaHtml(id);
    } catch {
      /* 下次再出片会按分镜重写 */
    }
  }
  for (const i of regen) startRegenStill(id, i);
  const fresh = (await readProject(id)) || project;
  return NextResponse.json({
    project: publicProject(fresh),
    note: "已写进分镜，成片需再出一次片",
  });
}
