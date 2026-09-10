import { spawnSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

export type OfficialHit = { name: string; title?: string };

const CACHE = new Map<string, OfficialHit[] | null>();

function catalogBin(): string | undefined {
  const bin = path.join(process.cwd(), "node_modules/.bin/hyperframes");
  return existsSync(bin) ? bin : undefined;
}

/** Official on-device rank (bge-small-en). Tests and missing CLI skip this. */
export function officialCatalogRank(query: string): OfficialHit[] | null {
  const q = query.trim();
  if (!q || process.env.VITEST) return null;
  if (CACHE.has(q)) return CACHE.get(q) ?? null;
  const bin = catalogBin();
  if (!bin) {
    CACHE.set(q, null);
    return null;
  }
  const res = spawnSync(bin, ["catalog", "--query", q, "--on-device", "--yes", "--json"], {
    encoding: "utf8",
    timeout: 90_000,
    cwd: process.cwd(),
  });
  if (res.status !== 0) {
    CACHE.set(q, null);
    return null;
  }
  try {
    const raw = JSON.parse(res.stdout) as { tier?: string; results?: OfficialHit[] };
    if (raw.tier !== "on-device" || !Array.isArray(raw.results)) {
      CACHE.set(q, null);
      return null;
    }
    const hits = raw.results.filter((it) => it?.name);
    CACHE.set(q, hits);
    return hits;
  } catch {
    CACHE.set(q, null);
    return null;
  }
}
