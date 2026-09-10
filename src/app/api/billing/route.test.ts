import { afterEach, describe, expect, it } from "vitest";
import os from "os";
import path from "path";
import { rm } from "fs/promises";
import { GET, POST as changePlan } from "@/app/api/billing/route";
import { POST as createTalk } from "@/app/api/projects/route";
import { isProduceBusy } from "@/lib/pipeline";
import { projectDir } from "@/lib/store";
import { closeDb } from "@/lib/sqlite";

const prevSqlite = process.env.DUAER_SQLITE;
const prevUnlock = process.env.BILLING_UNLOCK;
const trash: string[] = [];

function isolate() {
  process.env.DUAER_SQLITE = path.join(
    os.tmpdir(),
    `duaer-bill-api-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`,
  );
  process.env.BILLING_UNLOCK = "";
  closeDb();
}

async function makeTalk(quality = "2K") {
  process.env.FLOW_MOCK = "1";
  const form = new FormData();
  form.set("idea", "人到中年还在等别人点头吗");
  form.set("aspect", "9:16");
  form.set("quality", quality);
  form.set("durationSec", "15");
  form.append("photos", new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" }));
  return createTalk(new Request("http://local/api/projects", { method: "POST", body: form }));
}

afterEach(async () => {
  for (const id of trash.splice(0)) {
    for (let i = 0; i < 80 && isProduceBusy(id); i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    await rm(projectDir(id), { recursive: true, force: true });
  }
  closeDb();
  if (prevSqlite === undefined) delete process.env.DUAER_SQLITE;
  else process.env.DUAER_SQLITE = prevSqlite;
  if (prevUnlock === undefined) delete process.env.BILLING_UNLOCK;
  else process.env.BILLING_UNLOCK = prevUnlock;
});

describe("billing API", () => {
  it("starts on trial and can open the talk plan", async () => {
    isolate();
    const first = await GET();
    expect(first.status).toBe(200);
    const snap = await first.json();
    expect(snap.planId).toBe("trial");
    expect(snap.remaining).toBe(2);
    expect(snap.catalog[1].monthlyYuan).toBe(128);

    const opened = await changePlan(
      new Request("http://local/api/billing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "activate", planId: "talk", cycle: "month" }),
      }),
    );
    expect(opened.status).toBe(200);
    const next = await opened.json();
    expect(next.planId).toBe("talk");
    expect(next.remaining).toBe(20);
  });

  it("blocks a third trial talk and 4K until daily", async () => {
    isolate();
    const a = await makeTalk();
    const b = await makeTalk();
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    trash.push((await a.json()).project.id, (await b.json()).project.id);

    const blocked = await makeTalk();
    expect(blocked.status).toBe(402);
    const blockedBody = await blocked.json();
    expect(blockedBody.error).toMatch(/条数用完/);
    expect(blockedBody.code).toBe("QUOTA");

    const fourK = await makeTalk("4K");
    expect(fourK.status).toBe(400);
    expect((await fourK.json()).code).toBe("QUALITY");

    await changePlan(
      new Request("http://local/api/billing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "activate", planId: "daily", cycle: "month" }),
      }),
    );
    const ok = await makeTalk("4K");
    expect(ok.status).toBe(200);
    trash.push((await ok.json()).project.id);
  });

  it("adds an extra pack of ten talks", async () => {
    isolate();
    const res = await changePlan(
      new Request("http://local/api/billing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "extra", count: 10 }),
      }),
    );
    expect(res.status).toBe(200);
    const snap = await res.json();
    expect(snap.remaining).toBe(12);
    expect(snap.extra).toBe(10);
  });
});
