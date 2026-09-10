"use client";

import { useEffect, useRef, useState } from "react";
import { AssistMarkdown } from "@/lib/assist-markdown";
import styles from "./page.module.css";

type ChatTurn = { role: "user" | "assistant"; content: string };
type Recommend = { id: string; label: string };

export function TalkAssistPanel({ talkId }: { talkId: string }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recs, setRecs] = useState<Recommend[]>([]);
  const [applyNote, setApplyNote] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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
    setRecs([]);
    try {
      const res = await fetch(`/api/projects/${talkId}/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextTurns }),
      });
      const data = (await res.json()) as { reply?: string; recommendations?: Recommend[]; error?: string };
      if (!res.ok) throw new Error(data.error || "助手这次没接上");
      setTurns([...nextTurns, { role: "assistant", content: data.reply || "" }]);
      setRecs(Array.isArray(data.recommendations) ? data.recommendations : []);
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
          <div
            key={`${turn.role}-${i}`}
            className={turn.role === "user" ? styles.assistBubbleUser : `${styles.assistBubbleBot} ${styles.assistMd}`}
          >
            {turn.role === "assistant" ? <AssistMarkdown text={turn.content} /> : turn.content}
          </div>
        ))}
        {busy ? <p className={styles.assistThinking}>在想…</p> : null}
        <div ref={endRef} />
      </div>
      {recs.length ? (
        <div className={styles.assistRecs}>
          <p className={styles.assistRecLabel}>可用到全片</p>
          <div className={styles.assistRecRow}>
            {recs.map((row) => (
              <button key={row.id} type="button" className={styles.assistRecBtn} onClick={() => applyStyle(row.id, row.label)}>
                {row.label}
              </button>
            ))}
          </div>
          {applyNote ? <p className={styles.assistNote}>{applyNote}</p> : null}
        </div>
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
