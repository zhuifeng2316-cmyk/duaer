import { afterEach, describe, expect, it } from "vitest";
import { readFile, rm } from "fs/promises";
import { GET as listTalks, POST } from "@/app/api/projects/route";
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getMedia } from "@/app/api/projects/[id]/media/route";
import { GET as getProject } from "@/app/api/projects/[id]/route";
import { POST as assembleCut } from "@/app/api/projects/[id]/assemble/route";
import { POST as regenCover } from "@/app/api/projects/[id]/cover/route";
import { POST as confirmCopy } from "@/app/api/projects/[id]/confirm/route";
import { POST as editTimeline } from "@/app/api/projects/[id]/edit/route";
import { POST as regenStill } from "@/app/api/projects/[id]/regen/route";
import { POST as editGraphic } from "@/app/api/projects/[id]/graphic/route";
import { POST as editCaptions } from "@/app/api/projects/[id]/captions/route";
import { POST as assistTalk } from "@/app/api/projects/[id]/assist/route";
import { POST as assistGraphic } from "@/app/api/projects/[id]/assist-graphic/route";
import { POST as retryTalk } from "@/app/api/projects/[id]/retry/route";
import { MOCK_SCRIPT } from "@/lib/copy";
import { makePlaceholderStill } from "@/lib/compose";
import { isProduceBusy } from "@/lib/pipeline";
import { recipeIntentLabels } from "@/lib/skill-recipes";
import { createProject, projectDir, projectFile, updateProject, writeProjectFile } from "@/lib/store";

const htmlProjectIds: string[] = [];

afterEach(async () => {
  for (const id of htmlProjectIds.splice(0)) {
    for (let i = 0; i < 80 && isProduceBusy(id); i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    await rm(projectDir(id), { recursive: true, force: true });
  }
});

describe("projects API", () => {
  it("health is up", async () => {
    const res = await getHealth();
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("lists a created talk and still returns it by id", async () => {
    process.env.FLOW_MOCK = "1";
    const form = new FormData();
    form.set("idea", "用我的照片做一条产品口播");
    form.set("aspect", "9:16");
    form.set("durationSec", "15");
    form.append("photos", new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" }));
    const created = await POST(new Request("http://local/api/projects", { method: "POST", body: form }));
    expect(created.status).toBe(200);
    const row = (await created.json()).project;
    htmlProjectIds.push(row.id);

    const listed = await listTalks();
    expect(listed.status).toBe(200);
    const data = await listed.json();
    expect(Array.isArray(data.talks)).toBe(true);
    expect(Array.isArray(data.wall)).toBe(true);
    const card = data.talks.find((t: { id: string }) => t.id === row.id);
    expect(card).toBeTruthy();
    expect(card.idea).toBe("用我的照片做一条产品口播");
    expect(typeof card.progress).toBe("number");
    expect(typeof card.message).toBe("string");
    expect(listed.headers.get("cache-control")).toMatch(/no-store/i);

    const detail = await getProject(new Request("http://local/api/projects/x"), {
      params: Promise.resolve({ id: row.id }),
    });
    expect(detail.status).toBe(200);
    const again = (await detail.json()).project;
    expect(again.id).toBe(row.id);
    expect(again.idea).toBe(row.idea);
    expect(again.quality).toBe("2K");
  });

  it("stores 4K when the form asks for it", async () => {
    process.env.FLOW_MOCK = "1";
    const form = new FormData();
    form.set("idea", "用我的照片做一条产品口播");
    form.set("aspect", "9:16");
    form.set("quality", "4K");
    form.set("durationSec", "15");
    form.append("photos", new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" }));
    const created = await POST(new Request("http://local/api/projects", { method: "POST", body: form }));
    expect(created.status).toBe(200);
    const row = (await created.json()).project;
    htmlProjectIds.push(row.id);
    expect(row.quality).toBe("4K");
  });

  it("rejects missing photos", async () => {
    const form = new FormData();
    form.set("idea", "用我的照片做一条产品口播");
    form.set("aspect", "9:16");
    const res = await POST(new Request("http://local/api/projects", { method: "POST", body: form }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/照片|人物/);
  });

  it("rejects a voice file attached to produce", async () => {
    const form = new FormData();
    form.set("idea", "用我的照片做一条产品口播");
    form.set("aspect", "9:16");
    form.append("photos", new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" }));
    form.append("voice", new File([new Uint8Array([1, 2, 3])], "x.webm", { type: "audio/webm" }));
    const res = await POST(new Request("http://local/api/projects", { method: "POST", body: form }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/在线录音/);
  });

  it("rejects an unknown character id", async () => {
    const form = new FormData();
    form.set("idea", "用我的照片做一条产品口播");
    form.set("aspect", "9:16");
    form.append("characterIds", "no-such-person");
    const res = await POST(new Request("http://local/api/projects", { method: "POST", body: form }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/人物不存在/);
  });

  it("rejects an unknown voice id", async () => {
    const form = new FormData();
    form.set("idea", "用我的照片做一条产品口播");
    form.set("aspect", "9:16");
    form.set("voiceId", "no-such-voice");
    form.append("photos", new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" }));
    const res = await POST(new Request("http://local/api/projects", { method: "POST", body: form }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/音色不存在/);
  });

  it("accepts a house voice without a recorded sample", async () => {
    process.env.FLOW_MOCK = "1";
    const form = new FormData();
    form.set("idea", "人到中年还在等别人点头吗");
    form.set("aspect", "9:16");
    form.set("voiceId", "house-yizhi");
    form.append("photos", new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" }));
    const created = await POST(new Request("http://local/api/projects", { method: "POST", body: form }));
    expect(created.status).toBe(200);
    const row = (await created.json()).project;
    htmlProjectIds.push(row.id);
    expect(row.voiceId).toBe("house-yizhi");
    expect(row.voicePath).toBeNull();
  });

  it("serves the composition html", async () => {
    const project = await createProject({ idea: "合成稿", look: "", aspect: "9:16", targetDurationSec: 15 });
    htmlProjectIds.push(project.id);
    await writeProjectFile(project.id, "compose/index.html", "<!doctype html><html><body>ok</body></html>");
    const res = await getMedia(new Request(`http://local/api/projects/${project.id}/media?f=compose/index.html`), {
      params: Promise.resolve({ id: project.id }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") || "").toMatch(/html/);
  });

  it("writes copy then waits for confirm before the picture board", async () => {
    process.env.FLOW_MOCK = "1";
    const form = new FormData();
    form.set("idea", "用我的照片做一条产品口播");
    form.set("aspect", "9:16");
    form.set("durationSec", "15");
    form.append("photos", new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" }));
    const created = await POST(new Request("http://local/api/projects", { method: "POST", body: form }));
    expect(created.status).toBe(200);
    const row = (await created.json()).project;
    htmlProjectIds.push(row.id);
    expect(row.characterIds || []).toEqual([]);
    let project = row;
    for (let i = 0; i < 40; i++) {
      const res = await getProject(new Request("http://local/api/projects/x"), {
        params: Promise.resolve({ id: row.id }),
      });
      project = (await res.json()).project;
      if (project.status === "review" || project.status === "failed") break;
      await new Promise((r) => setTimeout(r, 80));
    }
    expect(project.status).toBe("review");
    expect(project.script?.shots?.length).toBeGreaterThan(0);
    expect(project.script.shots[0].voiceover).toBeTruthy();
    expect(project.script.visualMode).toBe("product");
    expect(project.stillUrls || []).toHaveLength(0);
    const confirm = await confirmCopy(new Request("http://local/api/projects/x/confirm", { method: "POST" }), {
      params: Promise.resolve({ id: row.id }),
    });
    expect(confirm.status).toBe(200);
    let board = (await confirm.json()).project;
    for (let i = 0; i < 40; i++) {
      const res = await getProject(new Request("http://local/api/projects/x"), {
        params: Promise.resolve({ id: row.id }),
      });
      board = (await res.json()).project;
      if ((board.status === "review" && board.phase === "board") || board.status === "failed") break;
      await new Promise((r) => setTimeout(r, 80));
    }
    expect(board.status).toBe("review");
    expect(board.phase).toBe("board");
    expect(board.script.shots[0].imagePrompt || board.script.shots[0].scene).toBeTruthy();
    expect(board.script.visualMode).toBe("product");
    expect(board.stillUrls || []).toHaveLength(0);
    const confirmBoard = await confirmCopy(new Request("http://local/api/projects/x/confirm", { method: "POST" }), {
      params: Promise.resolve({ id: row.id }),
    });
    expect(confirmBoard.status).toBe(200);
    const next = await confirmBoard.json();
    expect(next.project.message).toMatch(/出图/);
    expect(next.project.status).not.toBe("review");
  });

  it("keeps knowledge board graphic intents on the recipe list", async () => {
    process.env.FLOW_MOCK = "1";
    const form = new FormData();
    form.set("idea", "写代码别一上来搭架构，先写一段能跑的");
    form.set("topic", "knowledge");
    form.set("aspect", "9:16");
    form.set("durationSec", "15");
    form.append("photos", new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" }));
    const created = await POST(new Request("http://local/api/projects", { method: "POST", body: form }));
    expect(created.status).toBe(200);
    const row = (await created.json()).project;
    htmlProjectIds.push(row.id);
    let project = row;
    for (let i = 0; i < 40; i++) {
      const res = await getProject(new Request("http://local/api/projects/x"), {
        params: Promise.resolve({ id: row.id }),
      });
      project = (await res.json()).project;
      if (project.status === "review" || project.status === "failed") break;
      await new Promise((r) => setTimeout(r, 80));
    }
    expect(project.status).toBe("review");
    expect(project.script.visualMode).toBe("knowledge");
    const confirm = await confirmCopy(new Request("http://local/api/projects/x/confirm", { method: "POST" }), {
      params: Promise.resolve({ id: row.id }),
    });
    expect(confirm.status).toBe(200);
    let board = (await confirm.json()).project;
    for (let i = 0; i < 40; i++) {
      const res = await getProject(new Request("http://local/api/projects/x"), {
        params: Promise.resolve({ id: row.id }),
      });
      board = (await res.json()).project;
      if ((board.status === "review" && board.phase === "board") || board.status === "failed") break;
      await new Promise((r) => setTimeout(r, 80));
    }
    expect(board.status).toBe("review");
    expect(board.phase).toBe("board");
    const allowed = recipeIntentLabels("knowledge");
    const shots = board.script.shots as Array<{ graphicIntent?: string; lettering?: string; layout?: string; block?: string; overlay?: string }>;
    for (const shot of shots) {
      const intent = String(shot.graphicIntent || "").trim();
      if (!intent) continue;
      expect(allowed.some((label) => intent === label || intent.includes(label))).toBe(true);
    }
    expect(shots.some((s) => s.block === "data-chart" || s.overlay === "data-chart")).toBe(false);
    expect(shots.every((s) => s.lettering)).toBe(true);
    expect(new Set(shots.map((s) => s.layout).filter(Boolean)).size).toBeGreaterThanOrEqual(3);
  });

  it("refuses to confirm before copy exists", async () => {
    const project = await createProject({ idea: "合成稿", look: "", aspect: "9:16", targetDurationSec: 15 });
    htmlProjectIds.push(project.id);
    const res = await confirmCopy(new Request("http://local/api/projects/x/confirm", { method: "POST" }), {
      params: Promise.resolve({ id: project.id }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/文案/);
  });

  it("refuses to regen a still before pictures exist", async () => {
    const project = await createProject({ idea: "合成稿", look: "", aspect: "9:16", targetDurationSec: 15 });
    htmlProjectIds.push(project.id);
    const res = await regenStill(
      new Request("http://local/api/projects/x/regen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotIndex: 0 }),
      }),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/画面/);
  });

  it("pauses after stills, regenerates one shot, then confirms before speech", async () => {
    process.env.FLOW_MOCK = "1";
    const form = new FormData();
    form.set("idea", "用我的照片做一条产品口播");
    form.set("aspect", "9:16");
    form.set("durationSec", "15");
    form.append("photos", new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" }));
    const created = await POST(new Request("http://local/api/projects", { method: "POST", body: form }));
    expect(created.status).toBe(200);
    const row = (await created.json()).project;
    htmlProjectIds.push(row.id);

    let project = row;
    for (let i = 0; i < 50; i++) {
      const res = await getProject(new Request("http://local/api/projects/x"), {
        params: Promise.resolve({ id: row.id }),
      });
      project = (await res.json()).project;
      if (project.status === "review" || project.status === "failed") break;
      await new Promise((r) => setTimeout(r, 80));
    }
    expect(project.status).toBe("review");
    await confirmCopy(new Request("http://local/api/projects/x/confirm", { method: "POST" }), {
      params: Promise.resolve({ id: row.id }),
    });
    for (let i = 0; i < 50; i++) {
      const res = await getProject(new Request("http://local/api/projects/x"), {
        params: Promise.resolve({ id: row.id }),
      });
      project = (await res.json()).project;
      if ((project.status === "review" && project.phase === "board") || project.status === "failed") break;
      await new Promise((r) => setTimeout(r, 80));
    }
    expect(project.phase).toBe("board");
    await confirmCopy(new Request("http://local/api/projects/x/confirm", { method: "POST" }), {
      params: Promise.resolve({ id: row.id }),
    });
    for (let i = 0; i < 80; i++) {
      const res = await getProject(new Request("http://local/api/projects/x"), {
        params: Promise.resolve({ id: row.id }),
      });
      project = (await res.json()).project;
      if ((project.status === "review" && project.phase === "images") || project.status === "failed") break;
      await new Promise((r) => setTimeout(r, 150));
    }
    expect(project.status).toBe("review");
    expect(project.phase).toBe("images");
    expect(project.finalUrl).toBeFalsy();
    expect(project.stillUrls.length).toBe(project.script.shots.length);
    expect(project.script.shots[0].imagePrompt || project.script.shots[0].scene).toBeTruthy();
    expect(project.message).toMatch(/对照/);

    const otherStill = project.script.shots.findIndex((shot: { hostStill?: boolean; overlay?: string; block?: string }, i: number) => i > 0 && project.stillUrls[i]);
    const shot1Before = await readFile(projectFile(row.id, "stills/shot-1.png"));
    const otherBefore = otherStill >= 0 ? await readFile(projectFile(row.id, `stills/shot-${otherStill + 1}.png`)) : null;
    const regen = await regenStill(
      new Request("http://local/api/projects/x/regen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotIndex: 0 }),
      }),
      { params: Promise.resolve({ id: row.id }) },
    );
    expect(regen.status).toBe(200);
    for (let i = 0; i < 50; i++) {
      const res = await getProject(new Request("http://local/api/projects/x"), {
        params: Promise.resolve({ id: row.id }),
      });
      project = (await res.json()).project;
      if (
        (project.status === "review" && project.phase === "images" && project.stillRev > 1) ||
        project.status === "failed"
      ) {
        break;
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    expect(project.status).toBe("review");
    expect(project.phase).toBe("images");
    expect(project.stillUrls).toHaveLength(project.script.shots.length);
    expect(project.stillUrls[0]).toMatch(/v=/);
    const shot1After = await readFile(projectFile(row.id, "stills/shot-1.png"));
    expect(shot1After.equals(shot1Before)).toBe(false);
    if (otherBefore && otherStill >= 0) {
      const otherAfter = await readFile(projectFile(row.id, `stills/shot-${otherStill + 1}.png`));
      expect(otherAfter.equals(otherBefore)).toBe(true);
    }

    const confirmStills = await confirmCopy(new Request("http://local/api/projects/x/confirm", { method: "POST" }), {
      params: Promise.resolve({ id: row.id }),
    });
    expect(confirmStills.status).toBe(200);
    expect((await confirmStills.json()).project.message).toMatch(/口播/);
    for (let i = 0; i < 80; i++) {
      const res = await getProject(new Request("http://local/api/projects/x"), {
        params: Promise.resolve({ id: row.id }),
      });
      project = (await res.json()).project;
      if (project.status === "ready" || project.status === "failed") break;
      await new Promise((r) => setTimeout(r, 200));
    }
    expect(project.status).toBe("ready");
    expect(project.finalUrl).toBeTruthy();
    expect(project.coverUrl).toMatch(/cover\.png/);
  }, 60_000);

  it("refuses timeline edit before a composition exists", async () => {
    const project = await createProject({ idea: "合成稿", look: "", aspect: "9:16", targetDurationSec: 15 });
    htmlProjectIds.push(project.id);
    const res = await editTimeline(new Request("http://local/api/projects/x/edit", { method: "POST" }), {
      params: Promise.resolve({ id: project.id }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/合成稿|微调/);
  });

  it("refuses a second cut before a composition exists", async () => {
    const project = await createProject({ idea: "合成稿", look: "", aspect: "9:16", targetDurationSec: 15 });
    htmlProjectIds.push(project.id);
    const res = await assembleCut(new Request("http://local/api/projects/x/assemble", { method: "POST" }), {
      params: Promise.resolve({ id: project.id }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/合成稿/);
  });

  it("refuses a new cover before the film or stills exist", async () => {
    const project = await createProject({ idea: "封面", look: "", aspect: "9:16", targetDurationSec: 15 });
    htmlProjectIds.push(project.id);
    const none = await regenCover(new Request("http://local/api/projects/x/cover", { method: "POST" }), {
      params: Promise.resolve({ id: project.id }),
    });
    expect(none.status).toBe(400);
    expect((await none.json()).error).toMatch(/成片/);

    await updateProject(project.id, { finalPath: "final.mp4" });
    const noStill = await regenCover(new Request("http://local/api/projects/x/cover", { method: "POST" }), {
      params: Promise.resolve({ id: project.id }),
    });
    expect(noStill.status).toBe(400);
    expect((await noStill.json()).error).toMatch(/静帧/);
  });

  it("regenerates a cover after the film is ready", async () => {
    process.env.FLOW_MOCK = "1";
    const project = await createProject({ idea: "换封面", look: "", aspect: "9:16", targetDurationSec: 15 });
    htmlProjectIds.push(project.id);
    await makePlaceholderStill(projectFile(project.id, "stills/shot-1.png"), "9:16", "0x1a2330");
    await updateProject(project.id, {
      status: "ready",
      phase: "done",
      finalPath: "final.mp4",
      stills: ["stills/shot-1.png"],
      script: MOCK_SCRIPT,
      coverRev: 1,
    });
    const res = await regenCover(
      new Request("http://local/api/projects/x/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: "stamp" }),
      }),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(res.status).toBe(200);
    expect((await res.json()).project.coverTemplate).toBe("stamp");
    for (let i = 0; i < 80; i++) {
      if (!isProduceBusy(project.id)) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    const detail = await getProject(new Request("http://local/api/projects/x"), {
      params: Promise.resolve({ id: project.id }),
    });
    const row = (await detail.json()).project;
    expect(row.status).toBe("ready");
    expect(row.coverUrl).toMatch(/cover\.png/);
    expect(row.coverUrl).toMatch(/v=/);
    expect(row.coverTemplate).toBe("stamp");
  }, 30_000);

  it("edits host still and component knobs on the board", async () => {
    process.env.FLOW_MOCK = "1";
    const project = await createProject({ idea: "产品轮播", look: "", aspect: "16:9", targetDurationSec: 15 });
    htmlProjectIds.push(project.id);
    const script = {
      ...MOCK_SCRIPT,
      visualMode: "product" as const,
      shots: [
        {
          ...MOCK_SCRIPT.shots[0]!,
          block: "carousel-circle-1",
          overlay: undefined,
          graphicIntent: "轮播",
          graphicAssets: { image1: "graphics/carousel-circle-1-image1.png" },
          graphicVars: { image1: "graphics/carousel-circle-1-image1.png" },
        },
        {
          ...MOCK_SCRIPT.shots[1]!,
          overlay: "pull-to-refresh",
          block: undefined,
          graphicIntent: "下拉刷新",
          graphicVars: { pullDistance: 120, spinnerStyle: "ring" },
        },
      ],
    };
    await updateProject(project.id, { script, status: "review", phase: "board", stills: [] });
    const host = await editGraphic(
      new Request("http://local/api/projects/x/graphic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotIndex: 0, hostStill: true }),
      }),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(host.status).toBe(200);
    expect((await host.json()).project.script.shots[0].hostStill).toBe(true);

    const knob = await editGraphic(
      new Request("http://local/api/projects/x/graphic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotIndex: 1, graphicVars: { spinnerStyle: "dots", pullDistance: 180 } }),
      }),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(knob.status).toBe(200);
    const row = (await knob.json()).project;
    expect(row.script.shots[1].graphicVars.spinnerStyle).toBe("dots");
    expect(row.script.shots[1].graphicVars.pullDistance).toBe(180);
    expect(row.script.shots[0].graphicIntent).toBe("轮播");
    expect(row.script.shots[1].graphicIntent).toBe("下拉刷新");
  });

  it("sets all-talk and per-shot caption styles", async () => {
    const project = await createProject({ idea: "换字幕", look: "", aspect: "9:16", targetDurationSec: 15 });
    htmlProjectIds.push(project.id);
    await updateProject(project.id, { script: MOCK_SCRIPT, status: "review", phase: "copy" });
    const tooSoon = await editCaptions(
      new Request("http://local/api/projects/x/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: "caption-neon-glow" }),
      }),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(tooSoon.status).toBe(400);
    expect((await tooSoon.json()).error).toMatch(/画面/);

    await updateProject(project.id, { status: "review", phase: "images" });
    const unknown = await editCaptions(
      new Request("http://local/api/projects/x/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: "nope" }),
      }),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(unknown.status).toBe(400);
    expect((await unknown.json()).error).toMatch(/没有这种字幕/);

    await writeProjectFile(project.id, "compose/index.html", "<!doctype html><html><body>old</body></html>");
    await updateProject(project.id, { htmlPath: "compose/index.html" });
    const all = await editCaptions(
      new Request("http://local/api/projects/x/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: "caption-neon-glow" }),
      }),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(all.status).toBe(200);
    const afterAll = (await all.json()).project;
    expect(afterAll.captionStyle).toBe("caption-neon-glow");
    expect(afterAll.script.shots.every((shot: { captionStyle?: string }) => !shot.captionStyle)).toBe(true);
    const html = await readFile(projectFile(project.id, "compose/index.html"), "utf8");
    expect(html).toContain("cap-neon-glow");

    const one = await editCaptions(
      new Request("http://local/api/projects/x/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: "caption-kinetic-slam", shotIndex: 0 }),
      }),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(one.status).toBe(200);
    const afterOne = (await one.json()).project;
    expect(afterOne.captionStyle).toBe("caption-neon-glow");
    expect(afterOne.script.shots[0].captionStyle).toBe("caption-kinetic-slam");
    expect(afterOne.script.shots[1].captionStyle || "").toBe("");

    const clear = await editCaptions(
      new Request("http://local/api/projects/x/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: "", shotIndex: 0 }),
      }),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(clear.status).toBe(200);
    expect((await clear.json()).project.script.shots[0].captionStyle).toBe("");
  });

  it("does not open the timeline editor in mock", async () => {
    process.env.FLOW_MOCK = "1";
    const project = await createProject({ idea: "合成稿", look: "", aspect: "9:16", targetDurationSec: 15 });
    htmlProjectIds.push(project.id);
    await writeProjectFile(project.id, "compose/index.html", "<!doctype html><html><body>ok</body></html>");
    await updateProject(project.id, { htmlPath: "compose/index.html" });
    const res = await editTimeline(new Request("http://local/api/projects/x/edit", { method: "POST" }), {
      params: Promise.resolve({ id: project.id }),
    });
    expect(res.status).toBe(400);
  });

  it("retries a failed talk from the last finished step", async () => {
    process.env.FLOW_MOCK = "1";
    const project = await createProject({ idea: "失败后重试", look: "", aspect: "9:16", targetDurationSec: 15 });
    htmlProjectIds.push(project.id);
    await writeProjectFile(project.id, "photos/photo-01.jpg", Buffer.from([1, 2, 3]));
    await updateProject(project.id, {
      photos: ["photos/photo-01.jpg"],
      status: "review",
      phase: "images",
      error: null,
      script: {
        hook: "钩",
        cta: "去",
        musicPrompt: "pad",
        visualMode: "knowledge",
        shots: [
          {
            scene: "窗边",
            imagePrompt: "窗边侧光",
            onScreenText: "看见",
            voiceover: "看见自己",
            durationSec: 3,
            motion: "push-in",
            kind: "close",
            layout: "hero",
            stillRefs: [],
          },
        ],
      },
    });
    const review = await retryTalk(new Request("http://local/api/projects/x/retry", { method: "POST" }), {
      params: Promise.resolve({ id: project.id }),
    });
    expect(review.status).toBe(400);

    await updateProject(project.id, {
      status: "failed",
      phase: "error",
      message: "生成失败",
      error: "generateCloneStill is not defined",
    });
    const res = await retryTalk(new Request("http://local/api/projects/x/retry", { method: "POST" }), {
      params: Promise.resolve({ id: project.id }),
    });
    expect(res.status).toBe(200);
    const row = (await res.json()).project;
    expect(row.status).toBe("queued");
    expect(row.error).toBeNull();
    expect(row.message).toMatch(/再出一次画面/);
  });

  it("answers caption recommendations from the talk assist endpoint", async () => {
    process.env.FLOW_MOCK = "1";
    const project = await createProject({ idea: "人到中年放过自己", look: "", aspect: "9:16", targetDurationSec: 15 });
    htmlProjectIds.push(project.id);
    await updateProject(project.id, { script: MOCK_SCRIPT, topic: "人到中年" });
    const res = await assistTalk(
      new Request("http://local/api/projects/x/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "有哪些字幕推荐？" }] }),
      }),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toMatch(/砸字/);
    expect(data.recommendations.some((row: { label: string }) => row.label === "砸字")).toBe(true);
    expect(JSON.stringify(data)).not.toMatch(/DeepSeek|GPT|方舟/i);
  });

  it("answers graphic recommendations and can apply a house component to one shot", async () => {
    process.env.FLOW_MOCK = "1";
    const project = await createProject({ idea: "人到中年放过自己", look: "", aspect: "9:16", targetDurationSec: 15 });
    htmlProjectIds.push(project.id);
    await updateProject(project.id, {
      script: { ...MOCK_SCRIPT, visualMode: "story" },
      topic: "人到中年",
      status: "review",
      phase: "images",
    });
    const ask = await assistTalk(
      new Request("http://local/api/projects/x/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "有哪些组件推荐？" }] }),
      }),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(ask.status).toBe(200);
    const asked = await ask.json();
    expect(asked.reply).toMatch(/闪白|漏光/);
    expect(asked.graphics.some((row: { label: string }) => row.label === "闪白")).toBe(true);
    expect(asked.recommendations || []).toEqual([]);

    const apply = await assistGraphic(
      new Request("http://local/api/projects/x/assist-graphic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "闪白", shotIndex: 0 }),
      }),
      { params: Promise.resolve({ id: project.id }) },
    );
    expect(apply.status).toBe(200);
    const after = (await apply.json()).project;
    expect(after.script.shots[0].graphicIntent).toBe("闪白");
    expect(after.script.shots[0].overlay || after.script.shots[0].block).toBeTruthy();
  });
});
