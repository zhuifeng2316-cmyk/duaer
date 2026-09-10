"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicTalkCard } from "@/lib/types";
import styles from "./page.module.css";

export const MINE_PAGE = 12;

export function nextMineCount(shown: number, total: number, page = MINE_PAGE): number {
  return Math.min(total, Math.max(page, shown + page));
}

export function posterRatio(aspect: string): string {
  const [w, h] = String(aspect || "").split(":");
  const left = Number(w);
  const right = Number(h);
  if (left > 0 && right > 0) return `${left} / ${right}`;
  return "3 / 4";
}

export function aspectWeight(aspect: string): number {
  const [w, h] = String(aspect || "").split(":");
  const left = Number(w);
  const right = Number(h);
  if (left > 0 && right > 0) return right / left;
  return 4 / 3;
}

export function packColumns<T>(items: T[], cols: number, weightOf: (item: T) => number): T[][] {
  const count = Math.max(1, cols);
  const buckets: T[][] = Array.from({ length: count }, () => []);
  const heights = Array(count).fill(0);
  for (const item of items) {
    let i = 0;
    for (let c = 1; c < count; c++) if (heights[c]! < heights[i]!) i = c;
    buckets[i]!.push(item);
    heights[i]! += weightOf(item);
  }
  return buckets;
}

function talkState(row: PublicTalkCard): string {
  if (row.status === "ready") return "成片好了";
  if (row.status === "failed") return row.error || "没做成";
  if (row.status === "review") {
    if (row.phase === "copy") return "待确认文案";
    if (row.phase === "board") return "待确认故事分镜";
    if (row.phase === "images") return "待确认画面";
    return "待确认";
  }
  return row.message || "正在做";
}

function WallCard({
  row,
  playing,
  onPlay,
}: {
  row: PublicTalkCard;
  playing: boolean;
  onPlay: () => void;
}) {
  const canPlay = Boolean(row.finalUrl);
  const ratio = { aspectRatio: posterRatio(row.aspect) };
  return (
    <article className={styles.wallCard}>
      {playing && row.finalUrl ? (
        <video
          className={styles.wallVideo}
          src={row.finalUrl}
          poster={row.thumbUrl || undefined}
          controls
          autoPlay
          playsInline
          aria-label={row.idea}
          style={ratio}
        />
      ) : (
        <button className={styles.wallPoster} type="button" style={ratio} aria-label={row.idea || "看"} onClick={() => canPlay && onPlay()}>
          {row.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.thumbUrl} alt="" />
          ) : (
            <span className={styles.talkThumbEmpty}>{row.aspect}</span>
          )}
          {canPlay ? <i>看</i> : null}
        </button>
      )}
    </article>
  );
}

function MineCard({ row }: { row: PublicTalkCard }) {
  const ratio = { aspectRatio: posterRatio(row.aspect) };
  return (
    <Link className={`${styles.wallCard} ${styles.mineCard}`} href={`/talks/${row.id}`}>
      <span className={styles.wallPoster} style={ratio}>
        {row.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.thumbUrl} alt="" />
        ) : (
          <span className={styles.talkThumbEmpty}>{row.aspect}</span>
        )}
      </span>
      <strong>{row.idea}</strong>
      <small>
        {talkState(row)}
        {row.status === "running" || row.status === "queued" ? ` · ${row.progress}%` : ""}
      </small>
    </Link>
  );
}

export function masonryColCount(kind: "mine" | "wall" | "page", width: number): number {
  if (kind === "wall") return width <= 860 ? 1 : 3;
  if (kind === "page") return width <= 860 ? 2 : width >= 1100 ? 4 : 3;
  return width <= 860 ? 2 : 3;
}

export function useMasonryCols(kind: "mine" | "wall" | "page") {
  const [cols, setCols] = useState(() => masonryColCount(kind, typeof window === "undefined" ? 1200 : window.innerWidth));
  useEffect(() => {
    const sync = () => setCols(masonryColCount(kind, window.innerWidth));
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [kind]);
  return cols;
}

export function MineMasonry({ talks, cols }: { talks: PublicTalkCard[]; cols: number }) {
  return (
    <div className={styles.mineMasonry} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {packColumns(talks, cols, (row) => aspectWeight(row.aspect)).map((col, i) => (
        <div className={styles.wallCol} key={i}>
          {col.map((row) => (
            <MineCard key={row.id} row={row} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function HomeWall() {
  const [wall, setWall] = useState<PublicTalkCard[] | null>(null);
  const [playingId, setPlayingId] = useState("");
  const wallCols = useMasonryCols("wall");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data = await res.json();
      if (cancelled || !res.ok) return;
      setWall(Array.isArray(data.wall) ? data.wall : []);
    }
    void load();
    const t = setInterval(() => void load(), 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    function onPlay(event: Event) {
      const el = event.target;
      if (!(el instanceof HTMLVideoElement)) return;
      document.querySelectorAll("video").forEach((node) => {
        if (node !== el && !node.paused) node.pause();
      });
    }
    document.addEventListener("play", onPlay, true);
    return () => document.removeEventListener("play", onPlay, true);
  }, []);

  return (
    <div className={styles.homeWall}>
      <section>
        <h2>热门大片</h2>
        {wall === null ? (
          <p className={styles.wallEmpty}>正在打开…</p>
        ) : wall.length === 0 ? (
          <p className={styles.wallEmpty}>还没有成片。做出第一条，就会出现在这里。</p>
        ) : (
          <div className={styles.wallMasonry} style={{ gridTemplateColumns: `repeat(${wallCols}, minmax(0, 1fr))` }}>
            {packColumns(wall.slice(0, 12), wallCols, (row) => aspectWeight(row.aspect)).map((col, i) => (
              <div className={styles.wallCol} key={i}>
                {col.map((row) => (
                  <WallCard key={row.id} row={row} playing={playingId === row.id} onPlay={() => setPlayingId(row.id)} />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
