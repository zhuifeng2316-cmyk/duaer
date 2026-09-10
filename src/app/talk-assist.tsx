"use client";

import { useEffect, useRef, useState } from "react";
import { AssistMarkdown } from "@/lib/assist-markdown";
import { captionStyleMeta } from "@/lib/caption-styles";
import { CaptionStyleTile, captionPreviewLines } from "./talk-workspace";
import styles from "./page.module.css";

type Recommend = { id: string; label: string };
type ChatTurn = { role: "user" | "assistant"; content: string; recommendations?: Recommend[] };

export function TalkAssistPanel({ talkId }: { talkId: string }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [applyNote, setApplyNote] = useState("");
  const [stillSrc, setStillSrc] = useState("");
  const [sampleText, setSampleText] = useState("口播字");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/projects/${talkId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const stills = Array.isArray(data.stillUrls) ? data.stillUrls : [];
        const still = stills.find((url: unknown) => typeof url === "string" && url) || data.coverUrl || "";
        const hook = data.script?.hook || "";
        const shotText = data.script?.shots?.[0]?.onScreenText || "";
        const text = hook || shotText || data.idea || "口播字";
        setStillSrc(typeof still === "string" ? still : "");
        setSampleText(String(text));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [talkId]);

  async function send(text?: string) {
    const content = (text ?? draft).trim();
    if (!content || busy) return;
    const nextTurns = [...turns, { role: "user" as const, content }];
    setTurns(nextTurns);
    setDraft("");
    setBusy(true);
    setError("");
    setApplyNote("");
    try {
      const res = await fetch(`/api/projects/${talkId}/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextTurns.map(({ role, content: body }) => ({ role, content: body })),
        }),
      });
      const data = (await res.json()) as { reply?: string; recommendations?: Recommend[]; error?: string };
      if (!res.ok) throw new Error(data.error || "助手这次没接上");
      const recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
      setTurns([
        ...nextTurns,
        {
          role: "assistant",
          content: data.reply || "",
          recommendations,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "助手这次没接上");
    } finally {
      setBusy(false);
    }
  }

  async function applyStyle(id: string, label: string) {
    setApplyNote("");
    try {
      const res = await fetch(`/api/projects/${talkId}/captions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "字幕没改上");
      setApplyNote(`已用到全片 · ${label}`);
    } catch (err) {
      setApplyNote(err instanceof Error ? err.message : "字幕没改上");
    }
  }

  const previewLines = captionPreviewLines(sampleText);

  return (
    <aside className={styles.assistRail} aria-label="口播助手">
      <div className={styles.assistHead}>
        <h2 className={styles.assistTitle}>助手</h2>
        <p className={styles.assistLede}>可问字幕怎么选，只从本站目录推荐。</p>
      </div>
      <div className={styles.assistPrompts}>
        <button type="button" className={styles.assistChip} disabled={busy} onClick={() => send("有哪些字幕推荐？")}>
          有哪些字幕推荐？
        </button>
        <button type="button" className={styles.assistChip} disabled={busy} onClick={() => send("钩子适合什么字？")}>
          钩子适合什么字？
        </button>
      </div>
      <div className={styles.assistThread}>
        {!turns.length && !busy ? <p className={styles.assistEmpty}>先问一句，比如字幕推荐。</p> : null}
        {turns.map((turn, i) => (
          <div key={`${turn.role}-${i}`} className={styles.assistTurn}>
            <div
              className={turn.role === "user" ? styles.assistBubbleUser : `${styles.assistBubbleBot} ${styles.assistMd}`}
            >
              {turn.role === "assistant" ? <AssistMarkdown text={turn.content} /> : turn.content}
            </div>
            {turn.role === "assistant" && turn.recommendations?.length ? (
              <div className={styles.assistRecs}>
                <p className={styles.assistRecLabel}>点样式用到全片</p>
                <div className={styles.assistRecRow}>
                  {turn.recommendations.map((row) => {
                    const meta = captionStyleMeta(row.id);
                    if (!meta) return null;
                    return (
                      <CaptionStyleTile
                        key={row.id}
                        id={row.id}
                        label={row.label}
                        preview={meta.preview}
                        lines={previewLines}
                        stillSrc={stillSrc}
                        frameClass={`${styles.wide} ${styles.assistRecFrame}`}
                        selected={false}
                        disabled={busy}
                        onPick={() => void applyStyle(row.id, row.label)}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {busy ? <p className={styles.assistThinking}>在想…</p> : null}
        {applyNote ? <p className={styles.assistNote}>{applyNote}</p> : null}
        <div ref={endRef} />
      </div>
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
