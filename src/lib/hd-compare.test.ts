import { execFile } from "child_process";
import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { promisify } from "util";
import { describe, expect, it } from "vitest";
import { readFile } from "fs/promises";
import { createTurn, publicTurn, readTurn, updateTurn } from "./turn-store";
import { retouchHead } from "./head-enhance";

const exec = promisify(execFile);

async function probeSize(file: string): Promise<{ w: number; h: number }> {
  const { stdout } = await exec("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "csv=p=0",
    file,
  ]);
  const [w, h] = stdout
    .trim()
    .split(",")
    .map((n) => Number(n));
  return { w, h };
}

async function makeFacePng(dest: string, w = 160, h = 200): Promise<void> {
  await mkdir(path.dirname(dest), { recursive: true });
  await exec("ffmpeg", ["-y", "-f", "lavfi", "-i", `testsrc=size=${w}x${h}:rate=1`, "-frames:v", "1", dest]);
}

describe("HD compare on the current flow", () => {
  it("exposes crop and HD urls so the review can sit them side by side", async () => {
    const turn = await createTurn();
    await updateTurn(turn.id, {
      status: "review",
      crop: "heads/01.png",
      head: "heads/01-hd.png",
      enhanced: true,
      faces: [
        {
          id: "1",
          label: "头像 1",
          crop: "heads/01.png",
          file: "heads/01-hd.png",
          enhanced: true,
          selected: true,
        },
      ],
    });
    const pub = publicTurn((await readTurn(turn.id))!);
    expect(pub.enhanced).toBe(true);
    expect(pub.faces[0]?.cropUrl).toMatch(/heads%2F01\.png/);
    expect(pub.faces[0]?.url).toMatch(/heads%2F01-hd\.png/);
    expect(pub.faces[0]?.cropUrl).not.toBe(pub.faces[0]?.url);
  });

  it("retouches the crop into a larger same-aspect image, not a copy", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "duaer-hd-"));
    const crop = path.join(dir, "crop.png");
    const hd = path.join(dir, "hd.png");
    const fixture = path.join(process.cwd(), "storage/prompt-bakeoff/head.png");
    try {
      await writeFile(crop, await readFile(fixture));
    } catch {
      await makeFacePng(crop, 160, 200);
    }
    await retouchHead(crop, hd);
    const before = await probeSize(crop);
    const after = await probeSize(hd);
    expect(after.w * after.h).toBeGreaterThan(before.w * before.h);
    expect(after.w / after.h).toBeCloseTo(before.w / before.h, 1);
    const beforeLong = Math.max(before.w, before.h);
    const afterLong = Math.max(after.w, after.h);
    expect(afterLong).toBeLessThanOrEqual(1920);
    expect(afterLong).toBeGreaterThanOrEqual(Math.min(1920, beforeLong * 3) - 2);
  });

  it("review compare CSS shows the full head, not a zoomed corner", async () => {
    const css = await readFile(path.join(process.cwd(), "src/app/page.module.css"), "utf8");
    expect(css).toMatch(/\.reviewCompare/);
    expect(css).toMatch(/\.review \.frame img[\s\S]*object-fit:\s*contain/);
    expect(css).not.toMatch(/transform:\s*scale\(2\.4\)/);
  });
});
