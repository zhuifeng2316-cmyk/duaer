import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/voices/route";
import { deleteVoice } from "@/lib/voice-store";

describe("voices API", () => {
  it("rejects a missing sample", async () => {
    const form = new FormData();
    form.set("name", "我");
    const res = await POST(new Request("http://local/api/voices", { method: "POST", body: form }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/说话录音/);
  });

  it("rejects a non-audio sample", async () => {
    const form = new FormData();
    form.set("name", "我");
    form.append("voice", new File([new Uint8Array([1, 2, 3])], "x.txt", { type: "text/plain" }));
    const res = await POST(new Request("http://local/api/voices", { method: "POST", body: form }));
    expect(res.status).toBe(400);
  });

  it("saves a voice and lists it", async () => {
    const form = new FormData();
    form.set("name", "测试音色");
    form.append("voice", new File([new Uint8Array([1, 2, 3, 4])], "me.mp3", { type: "audio/mpeg" }));
    const res = await POST(new Request("http://local/api/voices", { method: "POST", body: form }));
    expect(res.status).toBe(200);
    const created = await res.json();
    expect(created.voice.name).toBe("测试音色");
    expect(created.voice.sampleUrl).toContain(created.voice.id);
    const list = await GET();
    const data = await list.json();
    expect(data.voices.some((v: { id: string }) => v.id === created.voice.id)).toBe(true);
    expect(data.lastVoiceId).toBe(created.voice.id);
    await deleteVoice(created.voice.id);
  });
});
