import { describe, expect, it } from "vitest";
import { POST as confirmTurn } from "@/app/api/turns/[id]/confirm/route";
import { POST as enhanceTurn } from "@/app/api/turns/[id]/enhance/route";
import { POST as regenView } from "@/app/api/turns/[id]/regen/route";
import { POST as selectFaces } from "@/app/api/turns/[id]/select/route";
import { POST } from "@/app/api/turns/route";
import { createTurn, readTurn, turnFile, updateTurn, writeTurnFile, type TurnFace } from "@/lib/turn-store";

function oneFace(file = "head.png"): TurnFace {
  return { id: "1", label: "头像 1", crop: file, file, enhanced: false, selected: true };
}

describe("turns API", () => {
  it("rejects a missing photo", async () => {
    const form = new FormData();
    const res = await POST(new Request("http://local/api/turns", { method: "POST", body: form }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/照片/);
  });

  it("rejects a non-image", async () => {
    const form = new FormData();
    form.append("photo", new File([new Uint8Array([1, 2, 3])], "x.txt", { type: "text/plain" }));
    const res = await POST(new Request("http://local/api/turns", { method: "POST", body: form }));
    expect(res.status).toBe(400);
  });

  it("refuses to expand before the head is confirmed", async () => {
    const turn = await createTurn();
    const res = await confirmTurn(new Request("http://local/api/turns/x/confirm", { method: "POST" }), {
      params: Promise.resolve({ id: turn.id }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/头像/);
  });

  it("refuses enhance before a head exists", async () => {
    const turn = await createTurn();
    const res = await enhanceTurn(new Request("http://local/api/turns/x/enhance", { method: "POST" }), {
      params: Promise.resolve({ id: turn.id }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/头像/);
  });

  it("starts enhance after a reviewed head", async () => {
    process.env.FLOW_MOCK = "1";
    const turn = await createTurn();
    await writeTurnFile(turn.id, "head.png", Buffer.from("x"));
    await updateTurn(turn.id, {
      status: "review",
      head: "head.png",
      crop: "head.png",
      source: "source.jpg",
      faces: [oneFace()],
    });
    const res = await enhanceTurn(new Request("http://local/api/turns/x/enhance", { method: "POST" }), {
      params: Promise.resolve({ id: turn.id }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.turn.status).toBe("enhancing");
    expect(data.turn.message).toMatch(/高清/);
  });

  it("starts expand after a reviewed head", async () => {
    process.env.FLOW_MOCK = "1";
    const turn = await createTurn();
    await writeTurnFile(turn.id, "head.png", Buffer.from("x"));
    await updateTurn(turn.id, {
      status: "review",
      head: "head.png",
      source: "source.jpg",
      faces: [oneFace()],
    });
    const res = await confirmTurn(new Request("http://local/api/turns/x/confirm", { method: "POST" }), {
      params: Promise.resolve({ id: turn.id }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.turn.status).toBe("queued");
    expect(data.turn.message).toMatch(/电影画面/);
  });

  it("saves which heads are selected", async () => {
    const turn = await createTurn();
    await updateTurn(turn.id, {
      status: "review",
      head: "heads/01.png",
      faces: [
        { id: "1", label: "头像 1", crop: "heads/01.png", file: "heads/01.png", enhanced: false, selected: true },
        { id: "2", label: "头像 2", crop: "heads/02.png", file: "heads/02.png", enhanced: false, selected: true },
      ],
    });
    const res = await selectFaces(
      new Request("http://local/api/turns/x/select", {
        method: "POST",
        body: JSON.stringify({ selected: ["2"] }),
      }),
      { params: Promise.resolve({ id: turn.id }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.turn.faces.map((f: { id: string; selected: boolean }) => [f.id, f.selected])).toEqual([
      ["1", false],
      ["2", true],
    ]);
  });

  it("refuses eight-angle expand when more than one head is selected", async () => {
    const turn = await createTurn();
    await updateTurn(turn.id, {
      status: "review",
      head: "heads/01.png",
      faces: [
        { id: "1", label: "头像 1", crop: "heads/01.png", file: "heads/01.png", enhanced: false, selected: true },
        { id: "2", label: "头像 2", crop: "heads/02.png", file: "heads/02.png", enhanced: false, selected: true },
      ],
    });
    const res = await confirmTurn(new Request("http://local/api/turns/x/confirm", { method: "POST" }), {
      params: Promise.resolve({ id: turn.id }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/只选一个人/);
  });

  it("refuses to regen a view before the eight stills are ready", async () => {
    const turn = await createTurn();
    const res = await regenView(
      new Request("http://local/api/turns/x/regen", {
        method: "POST",
        body: JSON.stringify({ viewId: "front" }),
      }),
      { params: Promise.resolve({ id: turn.id }) },
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/八张齐了/);
  });

  it("regenerates only the requested angle and keeps the others", async () => {
    process.env.FLOW_MOCK = "1";
    const turn = await createTurn();
    await writeTurnFile(turn.id, "heads/01.png", Buffer.from("head"));
    await writeTurnFile(turn.id, "views/01-front-v1.png", Buffer.from("old-front"));
    await writeTurnFile(turn.id, "views/02-front-right-v1.png", Buffer.from("keep-right"));
    await updateTurn(turn.id, {
      status: "ready",
      head: "heads/01.png",
      crop: "heads/01.png",
      source: "heads/01.png",
      faces: [oneFace("heads/01.png")],
      views: [
        { id: "front", label: "正面", file: "views/01-front-v1.png", version: 1 },
        { id: "front-right", label: "右前", file: "views/02-front-right-v1.png", version: 1 },
        { id: "right", label: "右侧", file: null },
        { id: "back-right", label: "右后", file: null },
        { id: "back", label: "背面", file: null },
        { id: "back-left", label: "左后", file: null },
        { id: "left", label: "左侧", file: null },
        { id: "front-left", label: "左前", file: null },
      ],
    });
    const res = await regenView(
      new Request("http://local/api/turns/x/regen", {
        method: "POST",
        body: JSON.stringify({ viewId: "front" }),
      }),
      { params: Promise.resolve({ id: turn.id }) },
    );
    expect(res.status).toBe(200);
    const started = await res.json();
    expect(started.turn.status).toBe("rerunning");
    expect(started.turn.regenViewId).toBe("front");
    expect(started.turn.message).toMatch(/正面/);
    for (let i = 0; i < 20; i++) {
      const cur = await readTurn(turn.id);
      if (cur?.status === "ready" && cur.views[0]?.version === 2) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    const done = await readTurn(turn.id);
    expect(done?.status).toBe("ready");
    expect(done?.views[0]?.version).toBe(2);
    expect(done?.views[0]?.file).toMatch(/front-v2/);
    expect(done?.views[1]?.file).toBe("views/02-front-right-v1.png");
    const { readFile } = await import("fs/promises");
    expect(await readFile(turnFile(turn.id, "views/02-front-right-v1.png"))).toEqual(Buffer.from("keep-right"));
  });
});
