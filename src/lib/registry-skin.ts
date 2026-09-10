import { CINEMA_GRAPHIC_TOKENS } from "./cinema";

const BAKED_COPY = new Set([
  "data-chart",
  "flowchart-vertical",
  "app-showcase",
  "pull-to-refresh",
  "hw-pipeline",
  "hw-title",
  "code-terminal-run",
  "carousel-circle-1",
  "marker-checklist-card",
  "share-sheet-carousel",
]);

export function needsRegistryCopySkin(name?: string): boolean {
  return Boolean(name && BAKED_COPY.has(name));
}

export function registrySkinId(name: string, clipId: string): string {
  return `${name}--${clipId}`;
}

export function remapRegistryComposition(html: string, from: string, to: string): string {
  if (!from || from === to) return html;
  return html.split(from).join(to);
}

function applyPairs(html: string, pairs: Array<[string, string]>): string {
  let next = html;
  for (const [from, to] of pairs) {
    if (!from || from === to) continue;
    next = next.split(from).join(to);
  }
  return next;
}

export function paintCinemaAccents(html: string): string {
  const t = CINEMA_GRAPHIC_TOKENS;
  return html
    .replace(/#e4fa72/gi, t.brand)
    .replace(/#35d6a0/gi, t.brand)
    .replace(/#71f5a7/gi, t.brand)
    .replace(/#22c55e/gi, t.brand)
    .replace(/#61a8ff/gi, t.accent)
    .replace(/#38bdf8/gi, t.accent)
    .replace(/#326[fF][aA]8/g, t.accent)
    .replace(/#ededef/gi, t.bg)
    .replace(/#faf9f6/gi, t.bg)
    .replace(/#f1f2ec/gi, t.bg)
    .replace(/#e8ecda/gi, t.surface)
    .replace(/#d9e0bc/gi, t.accent2)
    .replace(/#c8d4a0/gi, t.surface)
    .replace(/#b8c78a/gi, t.muted)
    .replace(/background:\s*#fff\b/gi, `background: ${t.surface}`)
    .replace(/background:\s*#ffffff\b/gi, `background: ${t.surface}`);
}

export function skinRegistryHtml(name: string, html: string, copy: { title: string; line: string }): string {
  const title = (copy.title || "这一组").replace(/\s+/g, " ").trim().slice(0, 18) || "这一组";
  const line = (copy.line || copy.title || "").replace(/\s+/g, " ").trim().slice(0, 24) || "看这里";
  let next = html;
  if (name === "data-chart") {
    next = applyPairs(next, [
      ["Monthly Revenue vs. Conversion Rate", title],
      ["这一组", title],
      ["Jan–Jun 2024, in thousands", line],
      ["看这里", line],
      [">Revenue<", ">收入<"],
      [">Conversion Rate<", ">转化<"],
      ["Source: Internal analytics", "本片"],
    ]);
  } else if (name === "flowchart-vertical") {
    next = applyPairs(next, [
      ["Should I learn to code?", title],
      ["这一组", title],
      [">Yes<", ">是<"],
      [">Not sure<", ">不确定<"],
      ["Start with Pythom", line],
      ["看这里", line],
      ["Try no-code first", "先试试看"],
      ["Build a personal website", "先做出来"],
      ["Take a free intro course", "再往下学"],
      [">You<", ">你<"],
    ]);
  } else if (name === "pull-to-refresh") {
    next = applyPairs(next, [
      ["Pull to refresh", "下拉刷新"],
      ["Pull to Refresh", "下拉刷新"],
      ["这一组", title],
      ["看这里", line],
      ["Release to refresh", "松开刷新"],
      [">Refreshing<", ">正在刷新<"],
      [">Activity<", `>${title}<`],
      ["Updated now", "刚刚"],
      ["Search activity", "搜索"],
      ["Alex shared a draft", title],
      ["Launch sequence, ready for review", line],
      ["Mika left feedback", "有一条新消息"],
      ["Three comments on the new flow", line],
      ["Noah published an update", "更新好了"],
      ["Mobile preview is available", line],
      ["Sara joined the project", "可以看了"],
      ["Workspace access granted", "已打开"],
    ]);
  } else if (name === "app-showcase") {
    next = applyPairs(next, [
      ["Unleash Full Potential", title],
      ["这一组", title],
      ["START NOW", "开始"],
      ["James Medrano", "口播"],
      ["Premium Member", "会员"],
      ["Weekly Goal", title],
      ["Your Progress", "进度"],
      ["See all", "全部"],
      [">Running<", ">跑步<"],
      [">Cycling<", ">骑行<"],
      [">Strength<", ">力量<"],
      ["Burned Calories", "消耗"],
    ]);
  } else if (name === "hw-pipeline") {
    next = applyPairs(next, [
      ['{ label: "Idea" }', `{ label: "${title}" }`],
      ['{ label: "这一组" }', `{ label: "${title}" }`],
      ['{ label: "Record" }', '{ label: "记下" }'],
      ['{ label: "Shine!" }', `{ label: "${line.slice(0, 8) || "成片"}" }`],
    ]);
  } else if (name === "hw-title") {
    next = applyPairs(next, [
      ['text: "shine like the star you are"', `text: ${JSON.stringify(title)}`],
      ["text: \"这一组\"", `text: ${JSON.stringify(title)}`],
    ]);
  } else if (name === "code-terminal-run") {
    next = applyPairs(next, [
      ["run build", "出片"],
      ["resolving 128 modules", "正在准备画面"],
      [">bundling <", ">正在合成 <"],
      ["ok 128 modules in 412 ms", "合成完成"],
      ["wrote ", "成片已落盘 "],
    ]);
  } else if (name === "marker-checklist-card") {
    next = applyPairs(next, [
      ["THE POWER", title.slice(0, 8) || "这一组"],
      [">OF<", ">要<"],
      ["\n            OF\n", "\n            要\n"],
      [">ONE<", ">算<"],
      ["ONE</span>", "算</span>"],
      [">FILE<", ">清<"],
      ["FILE</span>", "清</span>"],
      [">WRITE<", ">一项<"],
      [">HTML<", ">算过<"],
      [">RENDER<", ">二项<"],
      [">IN 4K<", ">算过<"],
      [">SHIP<", ">三项<"],
      [">TODAY<", ">算过<"],
      ["WRITE</div>", "一项</div>"],
      ["HTML</div>", "算过</div>"],
      ["RENDER</div>", "二项</div>"],
      ["IN 4K</div>", "算过</div>"],
      ["SHIP</div>", "三项</div>"],
      ["TODAY</div>", "算过</div>"],
      ['"THE POWER"', JSON.stringify(title.slice(0, 8) || "这一组")],
      ['"OF"', '"要"'],
      ['"ONE"', '"算"'],
      ['"FILE"', '"清"'],
      ['"WRITE"', '"一项"'],
      ['"HTML"', '"算过"'],
      ['"RENDER"', '"二项"'],
      ['"IN 4K"', '"算过"'],
      ['"SHIP"', '"三项"'],
      ['"TODAY"', '"算过"'],
    ]);
  } else if (name === "share-sheet-carousel") {
    next = applyPairs(next, [
      [" would like to share ", " 想分享 "],
      ['"a video"', '"一条口播"'],
      ["a video", "一条口播"],
      [">Accept<", ">接受<"],
      [">Decline<", ">拒绝<"],
      ["Accept</div>", "接受</div>"],
      ["Decline</div>", "拒绝</div>"],
      ['"Accept"', '"接受"'],
      ['"Decline"', '"拒绝"'],
      ['"Share"', JSON.stringify(title.slice(0, 8) || "分享")],
      ["OPEN-SOURCE VIDEO ENGINE · SHIP FROM HTML", title.slice(0, 18) || "口播成片"],
    ]);
  }
  return paintCinemaAccents(next);
}

export function skinnedRegistryHtml(
  name: string,
  html: string,
  clipId: string,
  copy: { title: string; line: string },
): { id: string; html: string } {
  const id = registrySkinId(name, clipId);
  return { id, html: remapRegistryComposition(skinRegistryHtml(name, html, copy), name, id) };
}

export function visibleRegistryCopy(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<title>[\s\S]*?<\/title>/gi, " ");
}

export const HOUSE_DEMO_ENGLISH =
  /Monthly Revenue|Should I learn|shine like the star you are|Pull to refresh|Unleash Full Potential|James Medrano|Alex shared a draft|Start with Pythom|Every great video starts|HyperFrames lets you|THE POWER|IN 4K|SHIP TODAY|would like to share|OPEN-SOURCE VIDEO ENGINE/i;
