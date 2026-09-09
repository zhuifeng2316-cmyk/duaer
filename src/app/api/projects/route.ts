import { NextResponse } from "next/server";
import path from "path";
import { parseAspect } from "@/lib/aspect";
import { parseDurationSec } from "@/lib/board";
import { bindCharacterIdentity, readCharacter, setLastCharacterIds } from "@/lib/character-store";
import { assertPhoto, extForMime, MAX_PHOTOS } from "@/lib/photos";
import { startProduce } from "@/lib/pipeline";
import { createProject, listProjects, projectDir, projectFile, updateProject, writeProjectFile } from "@/lib/store";
import { publicProject, publicTalkCard } from "@/lib/types";
import { bindVoiceSample, readVoice, setLastVoiceId } from "@/lib/voice-store";

export async function GET() {
  const rows = await listProjects();
  return NextResponse.json(
    { talks: rows.map(publicTalkCard) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const idea = String(form.get("idea") || "").trim();
    if (idea.length < 4) {
      return NextResponse.json({ error: "先写一句口播要讲什么" }, { status: 400 });
    }
    const look = String(form.get("look") || "").trim();
    const targetDurationSec = parseDurationSec(String(form.get("durationSec") || ""));
    const aspect = parseAspect(String(form.get("aspect") || ""));
    const files = form.getAll("photos").filter((v): v is File => v instanceof File && v.size > 0);
    const characterIds = [
      ...new Set(form.getAll("characterIds").map((v) => String(v).trim()).filter(Boolean)),
    ];
    if (!files.length && !characterIds.length) {
      return NextResponse.json({ error: "先上传至少一张人物照片，或选用已保存的人物" }, { status: 400 });
    }
    if (files.length > MAX_PHOTOS) {
      return NextResponse.json({ error: `人物照片最多 ${MAX_PHOTOS} 张` }, { status: 400 });
    }
    for (const f of files) assertPhoto(f);
    for (const cid of characterIds) {
      if (!(await readCharacter(cid))) {
        return NextResponse.json({ error: "人物不存在" }, { status: 400 });
      }
    }

    let voiceId = String(form.get("voiceId") || "").trim() || null;
    const voiceUpload = form.get("voice");
    if (voiceUpload instanceof File && voiceUpload.size > 0) {
      return NextResponse.json({ error: "音色请先在线录音保存，再点选" }, { status: 400 });
    }
    if (voiceId) {
      const existing = await readVoice(voiceId);
      if (!existing) {
        return NextResponse.json({ error: "音色不存在" }, { status: 400 });
      }
    }

    const project = await createProject({ idea, look, aspect, targetDurationSec });
    const photos: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const name = `photos/photo-${String(i + 1).padStart(2, "0")}.${extForMime(file.type)}`;
      await writeProjectFile(project.id, name, Buffer.from(await file.arrayBuffer()));
      photos.push(name);
    }
    for (const cid of characterIds) {
      const more = await bindCharacterIdentity(cid, projectDir(project.id), photos.length);
      photos.push(...more);
    }
    if (!photos.length) {
      return NextResponse.json({ error: "先上传至少一张人物照片，或选用已保存的人物" }, { status: 400 });
    }
    if (photos.length > MAX_PHOTOS) {
      return NextResponse.json({ error: `人物照片最多 ${MAX_PHOTOS} 张` }, { status: 400 });
    }
    if (characterIds.length) await setLastCharacterIds(characterIds);
    let voicePath: string | null = null;
    if (voiceId) {
      const savedVoice = await readVoice(voiceId);
      if (!savedVoice) {
        return NextResponse.json({ error: "音色不存在" }, { status: 400 });
      }
      voicePath = `voice/ref${path.extname(savedVoice.sample) || ".mp3"}`;
      await bindVoiceSample(voiceId, projectFile(project.id, voicePath));
      await setLastVoiceId(voiceId);
    }
    const saved = await updateProject(project.id, {
      photos,
      characterIds,
      voiceId,
      voicePath,
      status: "queued",
      message: "开始做口播",
    });
    startProduce(project.id);
    return NextResponse.json({ project: publicProject(saved) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "创建失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
