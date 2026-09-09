import { afterEach, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/characters/route";
import { GET as getCharacter, PATCH as renameCharacter } from "@/app/api/characters/[id]/route";
import { GET as getCharacterMedia } from "@/app/api/characters/[id]/media/route";
import { POST as expandCharacter } from "@/app/api/characters/[id]/expand/route";
import { POST as regenCharacterView } from "@/app/api/characters/[id]/regen/route";
import { POST as renameFace } from "@/app/api/turns/[id]/rename/route";
import { ANGLE_VIEWS } from "@/lib/angles";
import { characterFile, deleteCharacter, readCharacter } from "@/lib/character-store";
import { createTurn, updateTurn, writeTurnFile } from "@/lib/turn-store";

const trash: string[] = [];

afterEach(async () => {
  for (const id of trash.splice(0)) await deleteCharacter(id);
});

describe("characters API", () => {
  it("renames a reviewed face", async () => {
    const turn = await createTurn();
    await writeTurnFile(turn.id, "heads/01.png", Buffer.from("crop"));
    await updateTurn(turn.id, {
      status: "review",
      faces: [
        { id: "1", label: "头像 1", crop: "heads/01.png", file: "heads/01.png", enhanced: false, selected: true },
      ],
    });
    const res = await renameFace(
      new Request("http://local/api/turns/x/rename", {
        method: "POST",
        body: JSON.stringify({ faceId: "1", name: "阿宁" }),
      }),
      { params: Promise.resolve({ id: turn.id }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.turn.faces[0].label).toBe("阿宁");
  });

  it("keeps the old label when the new name is blank", async () => {
    const turn = await createTurn();
    await writeTurnFile(turn.id, "heads/01.png", Buffer.from("crop"));
    await updateTurn(turn.id, {
      status: "review",
      faces: [
        { id: "1", label: "头像 1", crop: "heads/01.png", file: "heads/01.png", enhanced: false, selected: true },
      ],
    });
    const res = await renameFace(
      new Request("http://local/api/turns/x/rename", {
        method: "POST",
        body: JSON.stringify({ faceId: "1", name: "   " }),
      }),
      { params: Promise.resolve({ id: turn.id }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.turn.faces[0].label).toBe("头像 1");
  });

  it("saves a named character and lists it", async () => {
    const turn = await createTurn();
    await writeTurnFile(turn.id, "heads/01.png", Buffer.from("crop-bytes"));
    await updateTurn(turn.id, {
      status: "review",
      faces: [
        { id: "1", label: "阿宁", crop: "heads/01.png", file: "heads/01.png", enhanced: false, selected: true },
      ],
    });
    const res = await POST(
      new Request("http://local/api/characters", {
        method: "POST",
        body: JSON.stringify({ turnId: turn.id, name: "阿宁" }),
      }),
    );
    expect(res.status).toBe(200);
    const created = await res.json();
    const row = created.characters[0];
    trash.push(row.id);
    expect(row.name).toBe("阿宁");
    expect(row.thumbUrl).toContain(row.id);
    const list = await GET();
    const data = await list.json();
    expect(data.characters.some((c: { id: string }) => c.id === row.id)).toBe(true);
    const media = await getCharacterMedia(
      new Request(`http://local/api/characters/${row.id}/media?f=crop.png`),
      { params: Promise.resolve({ id: row.id }) },
    );
    expect(media.status).toBe(200);
    expect(media.headers.get("content-type")).toMatch(/png/);
  });

  it("rejects save before a head exists", async () => {
    const res = await POST(
      new Request("http://local/api/characters", {
        method: "POST",
        body: JSON.stringify({ turnId: "missing" }),
      }),
    );
    expect([400, 404]).toContain(res.status);
    const data = await res.json();
    expect(data.error).toMatch(/不存在|头像/);
  });

  it("renames a saved character", async () => {
    const turn = await createTurn();
    await writeTurnFile(turn.id, "heads/01.png", Buffer.from("crop-bytes"));
    await updateTurn(turn.id, {
      status: "review",
      faces: [
        { id: "1", label: "头像 1", crop: "heads/01.png", file: "heads/01.png", enhanced: false, selected: true },
      ],
    });
    const created = await POST(
      new Request("http://local/api/characters", {
        method: "POST",
        body: JSON.stringify({ turnId: turn.id }),
      }),
    );
    const row = (await created.json()).characters[0];
    trash.push(row.id);
    const res = await renameCharacter(
      new Request("http://local/api/characters/x", {
        method: "PATCH",
        body: JSON.stringify({ name: "阿宁" }),
      }),
      { params: Promise.resolve({ id: row.id }) },
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.character.name).toBe("阿宁");
  });

  it("returns eight angle slots for a saved character", async () => {
    const turn = await createTurn();
    await writeTurnFile(turn.id, "heads/01.png", Buffer.from("crop-bytes"));
    await writeTurnFile(turn.id, "views/01-front.png", Buffer.from("front"));
    await updateTurn(turn.id, {
      status: "ready",
      faces: [
        { id: "1", label: "阿宁", crop: "heads/01.png", file: "heads/01.png", enhanced: false, selected: true },
      ],
      views: [{ id: "front", label: "正面", file: "views/01-front.png", version: 1 }],
    });
    const created = await POST(
      new Request("http://local/api/characters", {
        method: "POST",
        body: JSON.stringify({ turnId: turn.id, name: "阿宁" }),
      }),
    );
    const row = (await created.json()).characters[0];
    trash.push(row.id);
    const res = await getCharacter(new Request("http://local/api/characters/x"), {
      params: Promise.resolve({ id: row.id }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.character.views).toHaveLength(8);
    expect(data.character.views[0].label).toBe("正面");
    expect(data.character.views[0].url).toContain("front");
    expect(data.character.views[1].url).toBeNull();
    expect(data.character.viewCount).toBe(1);
  });

  it("fills missing angles on a saved character and can regen one view", async () => {
    process.env.FLOW_MOCK = "1";
    const turn = await createTurn();
    await writeTurnFile(turn.id, "heads/01.png", Buffer.from("crop-bytes"));
    await updateTurn(turn.id, {
      status: "review",
      faces: [
        { id: "1", label: "阿宁", crop: "heads/01.png", file: "heads/01.png", enhanced: false, selected: true },
      ],
    });
    const created = await POST(
      new Request("http://local/api/characters", {
        method: "POST",
        body: JSON.stringify({ turnId: turn.id, name: "阿宁" }),
      }),
    );
    const row = (await created.json()).characters[0];
    trash.push(row.id);

    const expand = await expandCharacter(new Request("http://local/api/characters/x/expand", { method: "POST" }), {
      params: Promise.resolve({ id: row.id }),
    });
    expect(expand.status).toBe(200);
    const started = await expand.json();
    expect(started.character.status).toBe("expanding");
    expect(started.character.message).toMatch(/八个方位/);

    for (let i = 0; i < 40; i++) {
      const cur = await readCharacter(row.id);
      if (cur?.status === "ready" && cur.views.filter((v) => v.file).length === 8) break;
      await new Promise((r) => setTimeout(r, 80));
    }
    const filled = await readCharacter(row.id);
    expect(filled?.views.filter((v) => v.file).length).toBe(8);

    const keepId = ANGLE_VIEWS[1]!.id;
    const keepRel = filled!.views.find((v) => v.id === keepId)!.file;
    const keepBytes = await import("fs/promises").then((fs) => fs.readFile(characterFile(row.id, keepRel)));

    const regen = await regenCharacterView(
      new Request("http://local/api/characters/x/regen", {
        method: "POST",
        body: JSON.stringify({ viewId: "front" }),
      }),
      { params: Promise.resolve({ id: row.id }) },
    );
    expect(regen.status).toBe(200);
    const regenStart = await regen.json();
    expect(regenStart.character.status).toBe("rerunning");
    expect(regenStart.character.regenViewId).toBe("front");

    for (let i = 0; i < 40; i++) {
      const cur = await readCharacter(row.id);
      if (cur?.status === "ready" && (cur.views.find((v) => v.id === "front")?.version || 0) >= 2) break;
      await new Promise((r) => setTimeout(r, 80));
    }
    const done = await readCharacter(row.id);
    expect(done?.status).toBe("ready");
    expect(done?.views.find((v) => v.id === "front")?.version).toBe(2);
    expect(done?.views.find((v) => v.id === keepId)?.file).toBe(keepRel);
    const { readFile } = await import("fs/promises");
    expect(await readFile(characterFile(row.id, keepRel))).toEqual(keepBytes);
  });

  it("refuses regen before the eight views exist", async () => {
    const turn = await createTurn();
    await writeTurnFile(turn.id, "heads/01.png", Buffer.from("crop-bytes"));
    await updateTurn(turn.id, {
      status: "review",
      faces: [
        { id: "1", label: "阿宁", crop: "heads/01.png", file: "heads/01.png", enhanced: false, selected: true },
      ],
    });
    const created = await POST(
      new Request("http://local/api/characters", {
        method: "POST",
        body: JSON.stringify({ turnId: turn.id, name: "阿宁" }),
      }),
    );
    const row = (await created.json()).characters[0];
    trash.push(row.id);
    const res = await regenCharacterView(
      new Request("http://local/api/characters/x/regen", {
        method: "POST",
        body: JSON.stringify({ viewId: "front" }),
      }),
      { params: Promise.resolve({ id: row.id }) },
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/八张齐了/);
  });
});
