import { ensureMp4Faststart } from "../src/lib/compose";
import { mediaFileResponse } from "../src/lib/media-range";
import { projectFile } from "../src/lib/store";

async function main() {
  const id = process.argv[2] || "d8a936bd-f108-4a15-9bb2-86dccc59e550";
  const abs = projectFile(id, "final.mp4");
  await ensureMp4Faststart(abs);
  const full = await mediaFileResponse(abs, new Request("http://local/m"), "video/mp4");
  console.log("full", full.status, full.headers.get("Accept-Ranges"), full.headers.get("Content-Length"));
  // drain stream so fd closes
  await full.arrayBuffer();
  const part = await mediaFileResponse(abs, new Request("http://local/m", { headers: { Range: "bytes=0-1023" } }), "video/mp4");
  console.log("part", part.status, part.headers.get("Content-Range"), part.headers.get("Content-Length"));
  const buf = Buffer.from(await part.arrayBuffer());
  console.log("chunk", buf.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
