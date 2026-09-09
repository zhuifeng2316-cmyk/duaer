import { afterEach, describe, expect, it } from "vitest";
import { readFile, rm } from "fs/promises";
import { GET as listTalks, POST } from "@/app/api/projects/route";
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getMedia } from "@/app/api/projects/[id]/media/route";
import { GET as getProject } from "@/app/api/projects/[id]/route";
import { POST as assembleCut } from "@/app/api/projects/[id]/assemble/route";
import { POST as confirmCopy } from "@/app/api/projects/[id]/confirm/route";
import { POST as editTimeline } from "@/app/api/projects/[id]/edit/route";
import { POST as regenStill } from "@/app/api/projects/[id]/regen/route";
import { isProduceBusy } from "@/lib/pipeline";
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
    expect(board.stillUrls || []).toHaveLength(0);
    const confirmBoard = await confirmCopy(new Request("http://local/api/projects/x/confirm", { method: "POST" }), {
      params: Promise.resolve({ id: row.id }),
    });
    expect(confirmBoard.status).toBe(200);
    const next = await confirmBoard.json();
    expect(next.project.message).toMatch(/出图/);
    expect(next.project.status).not.toBe("review");
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

    const shot2Before = await readFile(projectFile(row.id, "stills/shot-2.png"));
    const shot1Before = await readFile(projectFile(row.id, "stills/shot-1.png"));
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
    const shot2After = await readFile(projectFile(row.id, "stills/shot-2.png"));
    const shot1After = await readFile(projectFile(row.id, "stills/shot-1.png"));
    expect(shot2After.equals(shot2Before)).toBe(true);
    expect(shot1After.equals(shot1Before)).toBe(false);

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
});
