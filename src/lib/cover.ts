import { copyFile, lstat } from "fs/promises";
import { aspectSize, parseQuality } from "./aspect";
import { cinemaMountVars } from "./cinema";
import { shouldTryHtmlVideoRender, snapshotCoverPoster } from "./cinema-render";
import { fitImageToAspect, makePlaceholderStill, stampCoverPoster } from "./compose";
import { filmGradeAttr } from "./html-compose";
import { registryRel } from "./hf-registry";
import {
  coverTemplateMeta,
  coverTitle,
  DEFAULT_COVER_TEMPLATE,
  parseCoverTemplate,
  wrapCoverTitle,
  type CoverTemplateId,
} from "./cover-templates";
import { projectFile, readProject, tryUpdateProject } from "./store";
import type { Script } from "./types";

export const COVER_REL = "cover.png";
export const COVER_COMPOSE_REL = "cover-compose";
/** 标题卡锁定进场 1.8 秒后定住，抓这一帧当海报。 */
export const COVER_SNAPSHOT_AT = 2.4;
export const COVER_CARD_SEC = 4;
export { coverTitle, DEFAULT_COVER_TEMPLATE, parseCoverTemplate, wrapCoverTitle };
export type { CoverTemplateId };

export function coverTemplateVars(id: CoverTemplateId, title: string): Record<string, string | number | boolean> {
  const wordmark = title || "口播";
  if (id === "titlecard-lockup") {
    return { wordmark, label: "", kicker: "", rule: "show", accent: "green", exit: "none" };
  }
  if (id === "titlecard-calm") {
    return { headline: wordmark, kicker: "" };
  }
  if (id === "headline-slam") {
    const parts = wrapCoverTitle(wordmark);
    return { text: parts.join(" "), accent_word_index: parts.length > 1 ? 1 : -1, accent: "green", shadow: true };
  }
  if (id === "cta-lockup") {
    return { action_line: wordmark, button_label: "听完这条", microcopy: "", accent: "green" };
  }
  if (id === "scramble-reveal") {
    return { text: wordmark, accent: "green", style: "clean", exit: "none" };
  }
  return {};
}

export function pickLastCoverStillRel(stills: string[]): string | null {
  for (let i = stills.length - 1; i >= 0; i--) {
    if (stills[i]) return stills[i];
  }
  return null;
}

function escapeCoverHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function letteringLayerHtml(id: CoverTemplateId, title: string, width: number, height: number): string {
  const lines = wrapCoverTitle(title).map(escapeCoverHtml);
  const joined = lines.join("<br/>");
  const size = Math.round(Math.min(width * 0.1, height * 0.13));
  if (id === "magazine") {
    return `<div class="lettering magazine" style="font-size:${size}px">${joined}</div>`;
  }
  if (id === "neon") {
    return `<div class="lettering neon" style="font-size:${Math.round(size * 0.92)}px">${joined}</div>`;
  }
  if (id === "glitch") {
    return `<div class="lettering glitch" style="font-size:${Math.round(size * 0.92)}px">${joined}</div>`;
  }
  return `<div class="lettering hand" style="font-size:${Math.round(size * 1.08)}px">${joined}</div>`;
}

export function generateCoverHtml(opts: {
  width: number;
  height: number;
  title: string;
  stillSrc?: string;
  template?: string;
}): string {
  const template = parseCoverTemplate(opts.template);
  const meta = coverTemplateMeta(template);
  const duration = meta.duration || COVER_CARD_SEC;
  const stillSrc = opts.stillSrc || "still.png";
  const title = opts.title || "口播";
  const src = registryRel(template) || `compositions/components/${template}.html`;
  const vars = JSON.stringify(coverTemplateVars(template, title)).replace(/'/g, "&#39;");
  const tokens = cinemaMountVars()
    .split(";")
    .filter((part) => part && !/^--(?:bg|background|hf-bg):/.test(part))
    .join(";");
  const overlayStyle = [
    "--bg:transparent",
    "--background:transparent",
    "--hf-bg:transparent",
    '--font-display:"Noto Serif SC","Songti SC",serif',
    tokens,
  ].join(";");
  const grade = filmGradeAttr();
  const overlay =
    meta.kind === "html"
      ? letteringLayerHtml(template, title, opts.width, opts.height)
      : `<div class="registry-overlay" data-composition-id="${template}" data-composition-src="${src}" data-start="0" data-duration="${duration}" data-track-index="1" data-variable-values='${vars}' style="${overlayStyle}"></div>`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${opts.width}, height=${opts.height}" />
  <title>cover</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600;700;800&family=Noto+Sans+SC:wght@300;700;900&display=swap" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; background: #000; overflow: hidden; width: ${opts.width}px; height: ${opts.height}px; }
    #root {
      position: relative; width: ${opts.width}px; height: ${opts.height}px;
      overflow: hidden; background: #07080c;
    }
    .clip { position: absolute; inset: 0; }
    .still { width: 100%; height: 100%; object-fit: cover; display: block; }
    .shade {
      position: absolute; inset: 0; z-index: 2; pointer-events: none;
      background: linear-gradient(180deg, rgba(8,6,4,0.16) 0%, rgba(8,6,4,0.38) 46%, rgba(8,6,4,0.58) 100%);
    }
    .registry-overlay, .lettering {
      position: absolute; inset: 0; z-index: 4; pointer-events: none;
    }
    .lettering { color: #fff6e6; display: flex; }
    .lettering.magazine {
      align-items: flex-start; justify-content: center; padding: 10% 8%;
      font-family: "Noto Serif SC", "Songti SC", serif; font-weight: 800; font-style: italic;
      line-height: 1.12; letter-spacing: 0.02em; text-shadow: 0 10px 28px rgba(0,0,0,.55);
    }
    .lettering.neon {
      align-items: flex-end; justify-content: center; padding: 0 8% 10%;
      font-family: "Noto Sans SC", "PingFang SC", sans-serif; font-weight: 900; text-align: center;
      line-height: 1.05; letter-spacing: 0.08em;
      color: #7ff7ef; text-shadow: 0 0 18px #2ee6d8, 0 0 42px #148f88;
    }
    .lettering.glitch {
      align-items: flex-end; justify-content: center; padding: 0 8% 10%;
      font-family: "Noto Sans SC", "PingFang SC", sans-serif; font-weight: 900; text-align: center;
      line-height: 1.05; letter-spacing: 0.06em;
      text-shadow: 3px 0 #ff3b5c, -3px 0 #3ad7ff;
    }
    .lettering.hand {
      align-items: center; justify-content: center; padding: 8%;
      font-family: "Kaiti SC", "STKaiti", "KaiTi", "Noto Serif SC", serif; font-weight: 700;
      line-height: 1.2; transform: rotate(-2.2deg); text-shadow: 0 6px 18px rgba(0,0,0,.5);
    }
  </style>
</head>
<body>
  <div id="root" data-composition-id="talk-cover" data-start="0" data-duration="${duration}" data-width="${opts.width}" data-height="${opts.height}" data-fps="30">
    <section class="clip" id="cover-still" data-start="0" data-duration="${duration}" data-track-index="0">
      <img class="still" src="${stillSrc}" data-color-grading='${grade}' alt="" />
      <div class="shade" aria-hidden="true"></div>
      ${overlay}
    </section>
  </div>
  <script>
(function () {
  var tl = gsap.timeline({ paused: true });
  tl.fromTo(".still", { scale: 1.02 }, { scale: 1.06, duration: ${duration}, ease: "none" }, 0);
  window.__timelines = window.__timelines || {};
  window.__timelines["talk-cover"] = tl;
})();
  </script>
</body>
</html>
`;
}

export function pickCoverStillRel(script: Script | null | undefined, stills: string[]): string | null {
  if (!stills.length) return null;
  const shots = script?.shots || [];
  let best = 0;
  let score = Number.NEGATIVE_INFINITY;
  stills.forEach((rel, i) => {
    if (!rel) return;
    const shot = shots[i];
    const blob = `${shot?.scene || ""} ${shot?.imagePrompt || ""} ${shot?.onScreenText || ""}`;
    let n = 0;
    if (/特写|近景|半身|正面|微笑/.test(blob)) n += 3;
    if (/远景|全身|空镜|拉远/.test(blob)) n -= 2;
    if (i === stills.length - 1) n += 1;
    if (n > score) {
      score = n;
      best = i;
    }
  });
  return stills[best] || stills[0] || null;
}

async function firstExistingRel(projectId: string, rels: Array<string | null | undefined>): Promise<string | null> {
  for (const rel of rels) {
    if (!rel) continue;
    try {
      await lstat(projectFile(projectId, rel));
      return rel;
    } catch {
      /* missing still */
    }
  }
  return null;
}

export async function writeTalkCover(projectId: string, opts?: { template?: string }): Promise<string | null> {
  const project = await readProject(projectId);
  if (!project) return null;
  const dest = projectFile(projectId, COVER_REL);
  const template = parseCoverTemplate(opts?.template ?? project.coverTemplate);
  const rel = await firstExistingRel(projectId, [
    pickLastCoverStillRel(project.stills),
    pickCoverStillRel(project.script, project.stills),
    project.photos[0],
  ]);
  const quality = parseQuality(project.quality);
  if (!rel) {
    await makePlaceholderStill(dest, project.aspect, "0x24180f", quality);
  } else {
    await copyFile(projectFile(projectId, rel), dest);
    await fitImageToAspect(dest, project.aspect, quality);
    const title = coverTitle(project.script, project.idea);
    const meta = coverTemplateMeta(template);
    let snapped = false;
    if (meta.kind !== "stamp" && shouldTryHtmlVideoRender()) {
      try {
        const size = aspectSize(project.aspect, quality);
        await snapshotCoverPoster({
          composeDir: projectFile(projectId, COVER_COMPOSE_REL),
          html: generateCoverHtml({ width: size.width, height: size.height, title, template }),
          stillAbs: dest,
          destAbs: dest,
          atSec: meta.snapshotAt || COVER_SNAPSHOT_AT,
          template,
        });
        snapped = true;
      } catch {
        snapped = false;
      }
    }
    if (!snapped) {
      try {
        await stampCoverPoster(dest, wrapCoverTitle(title), project.aspect, quality);
      } catch {
        /* 静帧已经锁脸，标题叠不上也比换人强 */
      }
    }
  }
  await tryUpdateProject(projectId, {
    coverPath: COVER_REL,
    coverRev: (project.coverRev || 0) + 1,
    coverTemplate: template,
  });
  return COVER_REL;
}
