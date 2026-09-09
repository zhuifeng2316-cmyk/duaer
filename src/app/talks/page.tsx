"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicTalkCard } from "@/lib/types";
import styles from "../page.module.css";

function talkState(row: PublicTalkCard): string {
  if (row.status === "ready") return "成片好了";
  if (row.status === "failed") return row.error || "没做成";
  if (row.status === "review") {
    if (row.phase === "copy") return "待确认文案";
    if (row.phase === "board") return "待确认分镜";
    if (row.phase === "images") return "待确认画面";
    return "待确认";
  }
  return row.message || "正在做";
}

export default function TalksPage() {
  const [talks, setTalks] = useState<PublicTalkCard[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error || "口播列表打不开");
        return;
      }
      setTalks(Array.isArray(data.talks) ? data.talks : []);
    }
    void load();
    const t = setInterval(() => void load(), 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className={styles.world}>
      <div className={styles.talkList}>
        <h1 className={styles.heroTitle}>我的口播</h1>
        {error && <p className={styles.err}>{error}</p>}
        {talks === null && <p className={styles.lede}>正在打开…</p>}
        {talks && talks.length === 0 && (
          <div className={styles.empty}>
            <p>还没有口播</p>
            <small>
              去 <Link href="/">做口播</Link> 写一条要讲的话
            </small>
          </div>
        )}
        {talks && talks.length > 0 && (
          <ul className={styles.talkCards}>
            {talks.map((row) => (
              <li key={row.id}>
                <Link className={styles.talkCard} href={`/talks/${row.id}`}>
                  {row.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={styles.talkThumb} src={row.thumbUrl} alt="" />
                  ) : (
                    <span className={styles.talkThumbEmpty}>{row.aspect}</span>
                  )}
                  <span className={styles.talkMeta}>
                    <strong>{row.idea}</strong>
                    <small>
                      {talkState(row)}
                      {row.status === "running" || row.status === "queued" ? ` · ${row.progress}%` : ""}
                    </small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
