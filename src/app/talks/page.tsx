"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicTalkCard } from "@/lib/types";
import { MineMasonry, useMasonryCols } from "../home-wall";
import styles from "../page.module.css";

export default function TalksPage() {
  const [talks, setTalks] = useState<PublicTalkCard[] | null>(null);
  const [error, setError] = useState("");
  const cols = useMasonryCols("page");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error || "列表打不开");
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
      <div className={styles.talkWall}>
        <h1 className={styles.heroTitle}>我的视频</h1>
        {error && <p className={styles.err}>{error}</p>}
        {talks === null && <p className={styles.lede}>正在打开…</p>}
        {talks && talks.length === 0 && (
          <div className={styles.empty}>
            <p>还没有视频</p>
            <small>
              去 <Link href="/">开始做</Link> 写一条要讲的话
            </small>
          </div>
        )}
        {talks && talks.length > 0 && <MineMasonry talks={talks} cols={cols} />}
      </div>
    </div>
  );
}
