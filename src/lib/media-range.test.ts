import { writeFile } from "fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { mediaFileResponse, parseByteRange } from "./media-range";
import { createProject, projectDir, projectFile } from "./store";
import { rm } from "fs/promises";

describe("media byte range", () => {
  const ids: string[] = [];
  afterEach(async () => {
    for (const id of ids.splice(0)) {
      await rm(projectDir(id), { recursive: true, force: true });
    }
  });

  it("parses open, closed, and suffix ranges", () => {
    expect(parseByteRange("bytes=0-9", 100)).toEqual({ start: 0, end: 9 });
    expect(parseByteRange("bytes=50-", 100)).toEqual({ start: 50, end: 99 });
    expect(parseByteRange("bytes=-20", 100)).toEqual({ start: 80, end: 99 });
    expect(parseByteRange("bytes=0-0", 100)).toEqual({ start: 0, end: 0 });
    expect(parseByteRange("bytes=100-", 100)).toBeNull();
    expect(parseByteRange(null, 100)).toBeNull();
  });

  it("serves full body with Accept-Ranges and Content-Length", async () => {
    const project = await createProject("range full", "tiktok", "auto");
    ids.push(project.id);
    const abs = projectFile(project.id, "final.mp4");
    await writeFile(abs, Buffer.from("0123456789abcdef"));
    const res = await mediaFileResponse(abs, new Request("http://local/media"), "video/mp4");
    expect(res.status).toBe(200);
    expect(res.headers.get("Accept-Ranges")).toBe("bytes");
    expect(res.headers.get("Content-Length")).toBe("16");
    expect(res.headers.get("Content-Type")).toBe("video/mp4");
    expect(Buffer.from(await res.arrayBuffer()).toString("utf8")).toBe("0123456789abcdef");
  });

  it("serves 206 partial content for Range requests", async () => {
    const project = await createProject("range part", "tiktok", "auto");
    ids.push(project.id);
    const abs = projectFile(project.id, "final.mp4");
    await writeFile(abs, Buffer.from("0123456789abcdef"));
    const res = await mediaFileResponse(
      abs,
      new Request("http://local/media", { headers: { Range: "bytes=4-7" } }),
      "video/mp4",
    );
    expect(res.status).toBe(206);
    expect(res.headers.get("Content-Range")).toBe("bytes 4-7/16");
    expect(res.headers.get("Content-Length")).toBe("4");
    expect(Buffer.from(await res.arrayBuffer()).toString("utf8")).toBe("4567");
  });
});
