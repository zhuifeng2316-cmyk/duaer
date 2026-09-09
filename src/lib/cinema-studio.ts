import { spawn } from "child_process";
import { access } from "fs/promises";
import path from "path";
import { isFlowMock } from "./flow/config";
import { projectFile } from "./store";

/** Keep off the site port (3002). */
export const CINEMA_EDITOR_PORT = Number(process.env.CINEMA_EDITOR_PORT || 4570) || 4570;

export function parsePreviewUrl(stdout: string, fallbackPort: number): string {
  const trimmed = stdout.trim();
  const jsonStart = trimmed.indexOf("{");
  if (jsonStart >= 0) {
    const slice = trimmed.slice(jsonStart);
    const jsonEnd = slice.lastIndexOf("}");
    if (jsonEnd >= 0) {
      try {
        const obj = JSON.parse(slice.slice(0, jsonEnd + 1)) as Record<string, unknown>;
        const nested = obj.data && typeof obj.data === "object" ? (obj.data as Record<string, unknown>) : {};
        const keys = ["studioUrl", "projectUrl", "url", "href", "editorUrl", "previewUrl"];
        for (const key of keys) {
          const v = obj[key] ?? nested[key];
          if (typeof v === "string" && /^https?:\/\//i.test(v)) return v.replace(/[.,)]+$/, "");
        }
      } catch {
        /* fall through */
      }
    }
  }
  const m = trimmed.match(/https?:\/\/[^\s"'\\]+/i);
  if (m?.[0]) return m[0].replace(/[.,)]+$/, "");
  return `http://127.0.0.1:${fallbackPort}`;
}

export function rewriteEditorHost(url: string, requestHost: string | null | undefined): string {
  try {
    const u = new URL(url);
    if (!requestHost) return u.toString();
    const host = requestHost.replace(/^\[/, "").replace(/\]$/, "").split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") u.hostname = host;
    return u.toString();
  } catch {
    return url;
  }
}

function runCapture(cmd: string, args: string[], opts: { cwd?: string; timeoutMs: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("时间轴打开超时"));
    }, opts.timeoutMs);
    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out || err);
      else reject(new Error((err || out).trim().split("\n").slice(-8).join(" | ") || `时间轴打不开 ${code}`));
    });
  });
}

export async function startCinemaEditor(projectId: string): Promise<{ url: string; port: number }> {
  if (isFlowMock() && (process.env.CINEMA_EDITOR || "").trim() !== "1") {
    throw new Error("测试环境不打开时间轴");
  }
  const composeDir = projectFile(projectId, "compose");
  const html = path.join(composeDir, "index.html");
  try {
    await access(html);
  } catch {
    throw new Error("还没有合成稿，成片后才能微调");
  }
  const port = CINEMA_EDITOR_PORT;
  const out = await runCapture(
    "npx",
    [
      "--yes",
      "hyperframes",
      "preview",
      composeDir,
      "--port",
      String(port),
      "--no-open",
      "--background",
      "--json",
    ],
    { timeoutMs: 90_000 },
  );
  return { url: parsePreviewUrl(out, port), port };
}
