import { afterEach, describe, expect, it } from "vitest";
import { rm } from "fs/promises";
import { POST } from "@/app/api/projects/route";
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getMedia } from "@/app/api/projects/[id]/media/route";
import { createProject, projectDir, writeProjectFile } from "@/lib/store";

const htmlProjectIds: string[] = [];

afterEach(async () => {
  for (const id of htmlProjectIds.splice(0)) {
    await rm(projectDir(id), { recursive: true, force: true });
  }
});

describe("projects API", () => {
  it("health is up", async () => {
    const res = await getHealth();
    const data = await res.json();
    expect(data.ok).toBe(true);
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

  it("rejects a non-audio voice sample", async () => {
    const form = new FormData();
    form.set("idea", "用我的照片做一条产品口播");
    form.set("aspect", "9:16");
    form.append("photos", new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" }));
    form.append("voice", new File([new Uint8Array([1, 2, 3])], "x.txt", { type: "text/plain" }));
    const res = await POST(new Request("http://local/api/projects", { method: "POST", body: form }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/说话录音/);
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
});
