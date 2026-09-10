"use client";

import { useEffect, useRef, useState } from "react";
import { AssistMarkdown } from "@/lib/assist-markdown";
import type { CaptionRecommendation, GraphicRecommendation } from "@/lib/talk-assist-shared";
import { AssistCaptionRecCards, type AssistShotPreview } from "./assist-caption-recs";
import { AssistGraphicRecCards } from "./assist-graphic-recs";
import styles from "./page.module.css";

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  recommendations?: CaptionRecommendation[];
  graphics?: GraphicRecommendation[];
};

export function TalkAssistPanel({
  talkId,
  recommendations,
  graphics,
  onRecommendations,
  onGraphics,
  onApplied,
  shots,
  frameClass,
}: {
  talkId: string;
  recommendations: CaptionRecommendation[];
  graphics: GraphicRecommendation[];
  onRecommendations: (recs: CaptionRecommendation[]) => void;
  onGraphics: (recs: GraphicRecommendation[]) => void;
  onApplied?: (target: { kind: "shot" | "all"; shotIndex?: number }, project?: unknown) => void;
  shots: AssistShotPreview[];
  frameClass: string;
}) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [applyNote, setApplyNote] = useState("");
  const [appliedKey, setAppliedKey] = useState("");
  const [appliedGfxKey, setAppliedGfxKey] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  }, [turns, busy]);

  async function send(text?: string) {
    const content = (text ?? draft).trim();
    if (!content || busy) return;
    const nextTurns = [...turns, { role: "user" as const, content }];
    setTurns(nextTurns);
    setDraft("");
    setBusy(true);
    setError("");
    setApplyNote("");
    onRecommendations([]);
    onGraphics([]);
    try {
      const res = await fetch(`/api/projects/${talkId}/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextTurns.map(({ role, content: body }) => ({ role, content: body })),
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        recommendations?: CaptionRecommendation[];
        graphics?: GraphicRecommendation[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "助手这次没接上");
      const recs = Array.isArray(data.recommendations) ? data.recommendations : [];
      const gfx = Array.isArray(data.graphics) ? data.graphics : [];
      setTurns([
        ...nextTurns,
        {
          role: "assistant",
          content: data.reply || "",
          recommendations: recs,
          graphics: gfx,
        },
      ]);
      onRecommendations(recs);
      onGraphics(gfx);
    } catch (err) {
      setError(err instanceof Error ? err.message : "助手这次没接上");
    } finally {
      setBusy(false);
    }
  }

  async function applyStyle(rec: CaptionRecommendation, target: "shot" | "all") {
    setError("");
    try {
      const body =
        target === "shot" && typeof rec.shotIndex === "number"
          ? { style: rec.id, shotIndex: rec.shotIndex }
          : { style: rec.id };
      const res = await fetch(`/api/projects/${talkId}/captions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; project?: unknown };
      if (!res.ok) throw new Error(data.error || "字幕没改上");
      setApplyNote(
        target === "shot" && typeof rec.shotIndex === "number"
          ? `已用到镜${rec.shotIndex + 1} · ${rec.label}`
          : `已用到全片 · ${rec.label}`,
      );
      setAppliedKey(`${rec.id}:${target}:${rec.shotIndex ?? "all"}`);
      onApplied?.(
        target === "shot" && typeof rec.shotIndex === "number"
          ? { kind: "shot", shotIndex: rec.shotIndex }
          : { kind: "all" },
        data.project,
      );
    } catch (err) {
      setApplyNote(err instanceof Error ? err.message : "字幕没改上");
    }
  }

  async function applyGraphic(rec: GraphicRecommendation, target: "shot" | "all") {
    setError("");
    try {
      const body =
        target === "shot" && typeof rec.shotIndex === "number"
          ? { label: rec.label, shotIndex: rec.shotIndex }
          : { label: rec.label };
      const res = await fetch(`/api/projects/${talkId}/assist-graphic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; project?: unknown };
      if (!res.ok) throw new Error(data.error || "组件没改上");
      setApplyNote(
        target === "shot" && typeof rec.shotIndex === "number"
          ? `已用到镜${rec.shotIndex + 1} · ${rec.label}`
          : `已用到各镜 · ${rec.label}`,
      );
      setAppliedGfxKey(`${rec.wraps}:${target}:${rec.shotIndex ?? "all"}`);
      onApplied?.(
        target === "shot" && typeof rec.shotIndex === "number"
          ? { kind: "shot", shotIndex: rec.shotIndex }
          : { kind: "all" },
        data.project,
      );
    } catch (err) {
      setApplyNote(err instanceof Error ? err.message : "组件没改上");
    }
  }

  const latestRecs =
    [...turns].reverse().find((turn) => turn.role === "assistant" && turn.recommendations?.length)?.recommendations ||
    recommendations;
  const latestGfx =
    [...turns].reverse().find((turn) => turn.role === "assistant" && turn.graphics?.length)?.graphics || graphics;

  return (
    <aside className={styles.assistRail} aria-label="口播助手">
      <div className={styles.assistHead}>
        <h2 className={styles.assistTitle}>助手</h2>
        <p className={styles.assistLede}>可问字幕或组件，预览会叠到对应故事片上。</p>
      </div>
      <div className={styles.assistPrompts}>
        <button type="button" className={styles.assistChip} disabled={busy} onClick={() => send("有哪些字幕推荐？")}>
          有哪些字幕推荐？
        </button>
        <button type="button" className={styles.assistChip} disabled={busy} onClick={() => send("有哪些组件推荐？")}>
          有哪些组件推荐？
        </button>
        <button type="button" className={styles.assistChip} disabled={busy} onClick={() => send("钩子适合什么字？")}>
          钩子适合什么字？
        </button>
      </div>
      <div className={styles.assistThread} ref={threadRef}>
        {!turns.length && !busy ? <p className={styles.assistEmpty}>先问一句，比如字幕或组件推荐。</p> : null}
        {turns.map((turn, i) => (
          <div key={`${turn.role}-${i}`} className={styles.assistTurn}>
            <div
              className={turn.role === "user" ? styles.assistBubbleUser : `${styles.assistBubbleBot} ${styles.assistMd}`}
            >
              {turn.role === "assistant" ? <AssistMarkdown text={turn.content} /> : turn.content}
            </div>
            {turn.role === "assistant" && turn.recommendations?.length ? (
              <div className={styles.assistRecs}>
                <p className={styles.assistRecLabel}>字幕预览 · 可点用</p>
                <AssistCaptionRecCards
                  recommendations={turn.recommendations}
                  shots={shots}
                  frameClass={`${frameClass} ${styles.assistRecFrame}`}
                  dense
                  busy={busy}
                  appliedKey={appliedKey}
                  onApply={(rec, target) => void applyStyle(rec, target)}
                />
              </div>
            ) : null}
            {turn.role === "assistant" && turn.graphics?.length ? (
              <div className={styles.assistRecs}>
                <p className={styles.assistRecLabel}>组件预览 · 可点用</p>
                <AssistGraphicRecCards
                  recommendations={turn.graphics}
                  shots={shots}
                  frameClass={`${frameClass} ${styles.assistRecFrame}`}
                  dense
                  busy={busy}
                  appliedKey={appliedGfxKey}
                  onApply={(rec, target) => void applyGraphic(rec, target)}
                />
              </div>
            ) : null}
          </div>
        ))}
        {busy ? <p className={styles.assistThinking}>在想…</p> : null}
        <div ref={endRef} />
      </div>
      {applyNote ? <p className={styles.assistNote}>{applyNote}</p> : null}
      {latestRecs.length || latestGfx.length ? (
        <p className={styles.assistStageHint}>右侧内容区也能对照预览</p>
      ) : null}
      {error ? <p className={styles.err}>{error}</p> : null}
      <form
        className={styles.assistForm}
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          className={styles.assistInput}
          rows={3}
          value={draft}
          placeholder="问助手…"
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button type="submit" className={styles.assistSend} disabled={busy || !draft.trim()}>
          发送
        </button>
      </form>
    </aside>
  );
}
