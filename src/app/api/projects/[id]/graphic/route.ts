import { NextResponse } from "next/server";
import { rewriteCinemaHtml } from "@/lib/cinema-render";
import { generateGraphicSlotImage, graphicAssetRel, houseItem } from "@/lib/duaer-registry";
import { applyShotGraphic, graphicSlots, shotGraphicName, shotNeedsPersonStill } from "@/lib/graphic-board";
import { isProduceBusy, startRegenStill } from "@/lib/pipeline";
import { assertPhoto, extForMime } from "@/lib/photos";
import { parseQuality } from "@/lib/aspect";
import { projectFile, readProject, updateProject, writeProjectFile } from "@/lib/store";
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

  const contentType = req.headers.get("content-type") || "";
  let shotIndex = -1;
  let slotId = "";
  let generate = false;
  let hostStill: boolean | undefined;
  let graphicVars: Record<string, string | number> | undefined;
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    shotIndex = Number(form.get("shotIndex"));
    slotId = String(form.get("slotId") || "").trim();
    generate = String(form.get("generate") || "") === "1";
    const upload = form.get("file");
    if (upload instanceof File && upload.size > 0) file = upload;
  } else {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "先改这一镜的组件" }, { status: 400 });
    }
    shotIndex = Number(body.shotIndex);
    slotId = String(body.slotId || "").trim();
    generate = body.generate === true;
    if (typeof body.hostStill === "boolean") hostStill = body.hostStill;
    if (body.graphicVars && typeof body.graphicVars === "object") {
      graphicVars = body.graphicVars as Record<string, string | number>;
    }
  }

  const shot = project.script.shots[shotIndex];
  if (!shot) return NextResponse.json({ error: "这一镜不在" }, { status: 400 });
  const name = shotGraphicName(shot);
  if (!name) return NextResponse.json({ error: "这一镜没有组件" }, { status: 400 });

  let script = project.script;
  const stills = project.stills.slice();
  while (stills.length < script.shots.length) stills.push("");
  let needStill = false;

  if (hostStill != null || graphicVars) {
    script = applyShotGraphic(script, shotIndex, { hostStill, graphicVars });
    const next = script.shots[shotIndex]!;
    if (shotNeedsPersonStill(next)) {
      if (!stills[shotIndex] && (project.phase === "images" || project.status === "ready")) needStill = true;
    } else {
      stills[shotIndex] = "";
    }
  }

  if (file || generate) {
    const slots = graphicSlots(name);
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return NextResponse.json({ error: "这一屏不在" }, { status: 400 });
    const house = houseItem(name);
    const rel = shot.graphicAssets?.[slot.id] || graphicAssetRel(house?.wraps || name, slot.id);
    if (file) {
      try {
        assertPhoto(file);
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "只要图片" }, { status: 400 });
      }
      const dest = rel.replace(/\.[a-z0-9]+$/i, `.${extForMime(file.type)}`);
      await writeProjectFile(id, dest, Buffer.from(await file.arrayBuffer()));
      const assets = { ...(shot.graphicAssets || {}), [slot.id]: dest };
      const uploads = [...new Set([...(shot.graphicUploads || []), slot.id])];
      const nextShots = script.shots.slice();
      nextShots[shotIndex] = {
        ...nextShots[shotIndex]!,
        graphicAssets: assets,
        graphicUploads: uploads,
        graphicVars: { ...(nextShots[shotIndex]!.graphicVars || {}), ...assets },
      };
      script = { ...script, shots: nextShots };
    } else {
      await generateGraphicSlotImage({
        destPath: projectFile(id, rel),
        hint: slot.hint,
        idea: project.idea,
        look: project.look,
        aspect: project.aspect,
        quality: parseQuality(project.quality),
      });
      const assets = { ...(shot.graphicAssets || {}), [slot.id]: rel };
      const uploads = (shot.graphicUploads || []).filter((id) => id !== slot.id);
      const nextShots = script.shots.slice();
      nextShots[shotIndex] = {
        ...nextShots[shotIndex]!,
        graphicAssets: assets,
        graphicUploads: uploads.length ? uploads : undefined,
        graphicVars: { ...(nextShots[shotIndex]!.graphicVars || {}), ...assets },
      };
      script = { ...script, shots: nextShots };
    }
  }

  const saved = await updateProject(id, {
    script,
    stills,
    stillRev: (project.stillRev || 0) + 1,
    htmlPath: project.htmlPath,
    error: null,
  });
  if (saved.htmlPath) {
    try {
      await rewriteCinemaHtml(id);
    } catch {
      /* 下次再出片会按分镜重写 */
    }
  }
  if (needStill) {
    const again = await updateProject(id, {
      status: "running",
      phase: "images",
      regenShotIndex: shotIndex,
      message: `正在出镜 ${shotIndex + 1}的人物底…`,
    });
    startRegenStill(id, shotIndex);
    return NextResponse.json({ project: publicProject(again) });
  }
  return NextResponse.json({ project: publicProject(saved) });
}
