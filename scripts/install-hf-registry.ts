import { mkdir, writeFile } from "fs/promises";
import { spawn } from "child_process";
import path from "path";

const ROOT = process.cwd();
const LAB = path.join(ROOT, "storage/hyperframes-registry");
const BIN = path.join(ROOT, "node_modules/.bin/hyperframes");
const CATALOG_OUT = path.join(ROOT, "src/lib/hf-registry-catalog.json");

function run(cmd: string, args: string[], opts?: { cwd?: string }): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: opts?.cwd || ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => {
      out += String(d);
    });
    child.stderr.on("data", (d) => {
      err += String(d);
    });
    child.on("close", (code) => resolve({ code: code ?? 1, out, err }));
  });
}

async function ensureLab() {
  await mkdir(LAB, { recursive: true });
  await writeFile(
    path.join(LAB, "hyperframes.json"),
    `${JSON.stringify(
      {
        $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
        registry: "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
        paths: { blocks: "compositions", components: "compositions/components", assets: "assets" },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

type CatalogItem = { name: string; type: string; title?: string; tags?: string[] };

async function loadCatalog(): Promise<CatalogItem[]> {
  const res = await run(BIN, ["catalog", "--json"]);
  if (res.code !== 0) throw new Error(res.err || "catalog failed");
  const raw = JSON.parse(res.out) as CatalogItem[];
  if (!Array.isArray(raw)) throw new Error("catalog json is not a list");
  return raw;
}

async function addOne(name: string): Promise<void> {
  let last = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await run(BIN, ["add", name, "--dir", LAB, "--no-clipboard", "--json"]);
    if (res.code === 0) return;
    last = (res.err || res.out).trim().split("\n").slice(-6).join(" | ");
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  throw new Error(`${name}: ${last || "add failed"}`);
}

async function mapPool<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
}

async function main() {
  await ensureLab();
  const items = await loadCatalog();
  const slim = items.map((it) => ({
    name: it.name,
    type: it.type,
    title: it.title || it.name,
    tags: it.tags || [],
  }));
  await writeFile(CATALOG_OUT, `${JSON.stringify(slim, null, 2)}\n`, "utf8");
  console.log(`catalog ${slim.length} -> ${CATALOG_OUT}`);
  let done = 0;
  const failed: string[] = [];
  await mapPool(items, 3, async (it) => {
    try {
      await addOne(it.name);
      done += 1;
      console.log(`ok ${done}/${items.length} ${it.name}`);
    } catch (err) {
      failed.push(it.name);
      console.error(`fail ${it.name}`, err instanceof Error ? err.message : err);
    }
  });
  await writeFile(path.join(LAB, "install-failed.txt"), failed.join("\n") + (failed.length ? "\n" : ""), "utf8");
  console.log(`installed ${done}/${items.length}, failed ${failed.length}`);
  if (failed.length) console.error(`failed: ${failed.join(", ")}`);
  if (done < 1) process.exit(1);
  console.log("done", LAB);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
