import { ANGLE_VIEWS, angleStillRel, turnaroundLead, turnaroundPrompt, type AngleView } from "./angles";
import { makePlaceholderStill } from "./compose";
import { isFlowMock } from "./flow/config";
import { generateStillFromRef } from "./flow/image";
import { copyAsHead, cropHead, detectHeadBoxes } from "./head-crop";
import { retouchHead } from "./head-enhance";
import { describeSubjectFromPhoto } from "./subject";
import { cinemaRefPaths, identityHeadRel } from "./turn-refs";
import { headFromFaces, readTurn, selectedFaces, turnFile, updateTurn, type Turn, type TurnFace } from "./turn-store";

const running = new Set<string>();

export function startCut(turnId: string): void {
  if (running.has(turnId)) return;
  running.add(turnId);
  void cutHead(turnId).finally(() => running.delete(turnId));
}

export function startEnhance(turnId: string): void {
  if (running.has(turnId)) return;
  running.add(turnId);
  void enhanceHead(turnId).finally(() => running.delete(turnId));
}

export function startExpand(turnId: string): void {
  if (running.has(turnId)) return;
  running.add(turnId);
  void expandTurn(turnId).finally(() => running.delete(turnId));
}

export function startRegenView(turnId: string, viewId: string): void {
  if (running.has(turnId)) return;
  running.add(turnId);
  void regenView(turnId, viewId).finally(() => running.delete(turnId));
}

export function isTurnBusy(turnId: string): boolean {
  return running.has(turnId);
}

/** @deprecated use startCut — POST /api/turns only isolates the head */
export function startTurn(turnId: string): void {
  startCut(turnId);
}

async function cutHead(turnId: string): Promise<void> {
  const turn = await readTurn(turnId);
  if (!turn) return;
  try {
    await updateTurn(turnId, { status: "cutting", progress: 12, message: "在抠头像…", error: null });
    const sourceAbs = turnFile(turnId, turn.source);
    const boxes = isFlowMock() ? [{ x: 12, y: 2, w: 76, h: 58 }] : await detectHeadBoxes(sourceAbs);
    const faces: TurnFace[] = [];
    for (let i = 0; i < boxes.length; i++) {
      const rel = `heads/${String(i + 1).padStart(2, "0")}.png`;
      const dest = turnFile(turnId, rel);
      if (isFlowMock()) await copyAsHead(sourceAbs, dest);
      else await cropHead(sourceAbs, dest, boxes[i]!);
      faces.push({
        id: String(i + 1),
        label: `头像 ${i + 1}`,
        crop: rel,
        file: rel,
        enhanced: false,
        selected: true,
      });
    }
    const sync = headFromFaces(faces);
    await updateTurn(turnId, {
      status: "review",
      progress: 40,
      message: faces.length > 1 ? `抠出 ${faces.length} 张头像，点选用哪些人` : "头像抠好了，可以先变高清再确认",
      crop: sync.crop,
      head: sync.head,
      enhanced: false,
      faces,
    });
  } catch (e) {
    await updateTurn(turnId, {
      status: "failed",
      progress: 100,
      message: "抠头像失败",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

async function enhanceHead(turnId: string): Promise<void> {
  const turn = await readTurn(turnId);
  if (!turn) return;
  try {
    const chosen = selectedFaces(turn);
    if (!chosen.length) throw new Error("先点选要变高清的头像");
    await updateTurn(turnId, { status: "enhancing", progress: 44, message: "在修这张原图的高清，不会换人…", error: null });
    const faces = turn.faces.length ? turn.faces.map((f) => ({ ...f })) : selectedFaces(turn);
    for (const face of chosen) {
      const srcAbs = turnFile(turnId, face.crop || face.file);
      const hdRel = `heads/${face.id.padStart(2, "0")}-hd.png`;
      const dest = turnFile(turnId, hdRel);
      await retouchHead(srcAbs, dest);
      const idx = faces.findIndex((f) => f.id === face.id);
      if (idx >= 0) faces[idx] = { ...faces[idx]!, file: hdRel, enhanced: true };
    }
    const sync = headFromFaces(faces);
    await updateTurn(turnId, {
      status: "review",
      progress: 55,
      message: chosen.length > 1 ? "选中的头像已按原图修好，点选用哪些人" : "已按原图修好清晰度，请对照后再出电影画面",
      faces,
      head: sync.head,
      crop: sync.crop,
      enhanced: sync.enhanced,
    });
  } catch (e) {
    await updateTurn(turnId, {
      status: "review",
      progress: 40,
      message: "高清没做成，仍可用现在这张确认",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

function cinemaRefsFor(turn: Turn): { refs: string[]; subject: string } {
  const sourceAbs = turnFile(turn.id, turn.source);
  const pick = selectedFaces(turn)[0];
  const headRel = pick ? identityHeadRel(pick) : turn.crop || turn.head;
  const headAbs = headRel ? turnFile(turn.id, headRel) : sourceAbs;
  return {
    refs: cinemaRefPaths(headAbs, turn.source ? sourceAbs : null),
    subject: turn.subject || "",
  };
}

async function renderAngleStill(opts: {
  turn: Turn;
  angle: AngleView;
  index: number;
  version: number;
  destRel: string;
}): Promise<void> {
  const dest = turnFile(opts.turn.id, opts.destRel);
  if (isFlowMock()) {
    await makePlaceholderStill(dest, "9:16", opts.index % 2 ? "0x243044" : "0x1a2330");
    return;
  }
  const { refs, subject } = cinemaRefsFor(opts.turn);
  await generateStillFromRef({
    prompt: turnaroundPrompt(opts.angle, subject),
    photoPaths: refs,
    destPath: dest,
    aspect: "9:16",
    lead: turnaroundLead(),
    extraBody: { size: "2K" },
  });
}

async function expandTurn(turnId: string): Promise<void> {
  const turn = await readTurn(turnId);
  if (!turn) return;
  try {
    await updateTurn(turnId, { status: "running", progress: 44, message: "在认这张头像…", error: null });
    const sourceAbs = turnFile(turnId, turn.source);
    const pick = selectedFaces(turn)[0];
    const headRel = pick ? identityHeadRel(pick) : turn.crop || turn.head;
    const headAbs = headRel ? turnFile(turnId, headRel) : sourceAbs;
    const views = turn.views.map((v) => ({ ...v }));

    let subject = turn.subject || "";
    if (!isFlowMock() && !subject) {
      try {
        subject = await describeSubjectFromPhoto(headAbs);
      } catch {
        subject = "";
      }
      await updateTurn(turnId, {
        subject,
        progress: 48,
        message: subject ? "已按头像认人，开始出电影画面" : "在出电影画面…",
      });
    } else {
      await updateTurn(turnId, { progress: 48, message: "在出电影画面…" });
    }

    const current = (await readTurn(turnId)) || turn;
    for (let i = 0; i < ANGLE_VIEWS.length; i++) {
      const angle = ANGLE_VIEWS[i]!;
      const version = 1;
      const rel = angleStillRel(i, angle.id, version);
      await updateTurn(turnId, {
        progress: 48 + Math.round(((i + 1) / ANGLE_VIEWS.length) * 50),
        message: `电影画面 ${i + 1}/8 · ${angle.label}`,
      });
      await renderAngleStill({ turn: current, angle, index: i, version, destRel: rel });
      views[i] = { id: angle.id, label: angle.label, file: rel, version };
      await updateTurn(turnId, {
        views: views.map((v) => ({ ...v })),
        progress: 48 + Math.round(((i + 1) / ANGLE_VIEWS.length) * 50),
        message: `电影画面 ${i + 1}/8 · ${angle.label}`,
      });
    }

    await updateTurn(turnId, {
      status: "ready",
      progress: 100,
      message: "八张电影画面好了",
      views,
      regenViewId: null,
    });
  } catch (e) {
    await updateTurn(turnId, {
      status: "failed",
      progress: 100,
      message: "拆角度失败",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

async function regenView(turnId: string, viewId: string): Promise<void> {
  const turn = await readTurn(turnId);
  if (!turn) return;
  const index = ANGLE_VIEWS.findIndex((v) => v.id === viewId);
  const angle = index >= 0 ? ANGLE_VIEWS[index] : undefined;
  const prev = turn.views[index];
  if (!angle || !prev?.file) {
    await updateTurn(turnId, {
      status: "ready",
      regenViewId: null,
      message: "八张电影画面好了",
      error: "要重做的这张还不在",
    });
    return;
  }
  const version = (prev.version || 1) + 1;
  const rel = angleStillRel(index, angle.id, version);
  try {
    await renderAngleStill({ turn, angle, index, version, destRel: rel });
    const views = turn.views.map((v, i) =>
      i === index ? { id: angle.id, label: angle.label, file: rel, version } : v,
    );
    await updateTurn(turnId, {
      status: "ready",
      progress: 100,
      message: `${angle.label}已重做`,
      error: null,
      views,
      regenViewId: null,
    });
  } catch (e) {
    await updateTurn(turnId, {
      status: "ready",
      progress: 100,
      regenViewId: null,
      message: `${angle.label}没重做成，还是上一张`,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
