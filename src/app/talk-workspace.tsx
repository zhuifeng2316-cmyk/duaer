"use client";

import { useEffect, useState } from "react";
import type { Aspect } from "@/lib/aspect";
import type { PublicProject } from "@/lib/types";
import styles from "./page.module.css";

type Shot = {
  scene: string;
  imagePrompt?: string;
  onScreenText: string;
  voiceover: string;
  durationSec: number;
  motion: string;
};

function shotBoardText(shot: Shot): string {
  return (shot.imagePrompt || shot.scene || "").trim();
}

function posterClass(aspect: Aspect): string {
  if (aspect === "1:1") return styles.sq;
  if (aspect === "16:9") return styles.wide;
  return styles.tall;
}

export function TalkWorkspace({ talkId }: { talkId: string }) {
  const [project, setProject] = useState<PublicProject | null>(null);
  const [error, setError] = useState("");
  const [confirmingCopy, setConfirmingCopy] = useState(false);
  const [regening, setRegening] = useState(false);
  const [editUrl, setEditUrl] = useState("");
  const [openingEdit, setOpeningEdit] = useState(false);
  const [reassembling, setReassembling] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/projects/${talkId}`, { cache: "no-store" });
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok || !data.project) {
        setMissing(true);
        setError("这条口播不在了");
        return;
      }
      setProject(data.project);
    })();
    return () => {
      cancelled = true;
    };
  }, [talkId]);

  const producing = project?.status === "queued" || project?.status === "running";

  useEffect(() => {
    if (!project?.id) return;
    if (project.status === "ready" || project.status === "failed" || project.status === "review") return;
    const ms = project.phase === "copy" || project.phase === "board" ? 280 : 1000;
    const t = setInterval(async () => {
      const res = await fetch(`/api/projects/${project.id}`);
      const data = await res.json();
      if (data.project) setProject(data.project);
    }, ms);
    return () => clearInterval(t);
  }, [project?.id, project?.status, project?.phase]);

  const reviewingCopy = project?.status === "review" && project.phase === "copy";
  const reviewingBoard = project?.status === "review" && project.phase === "board";
  const reviewingStills = project?.status === "review" && project.phase === "images";
  const writingCopy = producing && (project?.phase === "copy" || !project?.phase || project?.phase === "idle");
  const writingBoard = producing && project?.phase === "board";
  const shotCount = project?.script?.shots.length || 0;
  const showImageWall =
    reviewingStills ||
    (project?.stillUrls.length || 0) > 0 ||
    Boolean(producing && project && ["images", "speech", "music", "html", "assemble"].includes(project.phase));
  const slots = showImageWall ? Math.max(shotCount, project?.stillUrls.length || 0) : 0;

  async function confirmCopy() {
    if (!project || project.status !== "review" || confirmingCopy) return;
    setConfirmingCopy(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "确认失败");
      if (data.project) setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "确认失败");
    } finally {
      setConfirmingCopy(false);
    }
  }

  async function regenProjectStill(shotIndex: number) {
    if (!project || confirmingCopy || producing || regening) return;
    if (project.status !== "review" && project.status !== "ready") return;
    setRegening(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/regen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotIndex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "重做失败");
      if (data.project) setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重做失败");
    } finally {
      setRegening(false);
    }
  }

  async function openTimeline() {
    if (!project?.htmlPath || openingEdit || producing) return;
    setOpeningEdit(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/edit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "时间轴打不开");
      if (data.project) setProject(data.project);
      const url = String(data.editUrl || "");
      if (!url) throw new Error("时间轴打不开");
      setEditUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "时间轴打不开");
    } finally {
      setOpeningEdit(false);
    }
  }

  async function assembleAgain() {
    if (!project?.htmlPath || reassembling || producing) return;
    setReassembling(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/assemble`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "再出片失败");
      if (data.project) setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "再出片失败");
    } finally {
      setReassembling(false);
    }
  }

  async function rewriteCopy() {
    if (!project || project.status !== "review" || confirmingCopy) return;
    setConfirmingCopy(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/rewrite`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "重写失败");
      if (data.project) setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重写失败");
    } finally {
      setConfirmingCopy(false);
    }
  }

  if (missing) {
    return (
      <section className={styles.stage}>
        <p className={styles.err}>{error || "这条口播不在了"}</p>
      </section>
    );
  }

  if (!project) {
    return (
      <section className={styles.stage}>
        <div className={styles.empty}>
          <p>口播</p>
          <small>正在打开…</small>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.stage}>
      <div className={styles.panel}>
        <p className={styles.talkIdea}>{project.idea}</p>
        <div className={styles.bar}>
          <div>
            <b>{project.message}</b>
            <i className={styles.meter} style={{ width: `${project.progress}%` }} />
          </div>
          <span>
            {project.progress}% · {project.aspect}
            {shotCount ? ` · ${shotCount}镜` : ""}
          </span>
        </div>
        {(error || project.error) && <p className={styles.err}>{error || project.error}</p>}
        {project.musicError && <p className={styles.warn}>配乐没加上：{project.musicError}</p>}
        {project.speechError && <p className={styles.warn}>口播没加上：{project.speechError}</p>}

        {(writingCopy || writingBoard) && project.draftText && (
          <div className={styles.copyReview}>
            <p className={styles.voiceLabel}>
              {writingBoard ? "图片分镜" : "口播文案"}
              <small>正在写…</small>
            </p>
            <pre className={styles.streamDraft}>{project.draftText}</pre>
          </div>
        )}

        {reviewingCopy && project.script && (
          <div className={styles.copyReview}>
            <p className={styles.voiceLabel}>
              口播文案
              <small>确认后才写图片分镜文字</small>
            </p>
            <ol className={styles.shots}>
              <li>
                <em className={styles.shotLine}>钩子</em> {project.script.hook}
              </li>
              {project.script.shots.map((s, i) => (
                <li key={i}>
                  <em className={styles.shotLine}>{s.onScreenText || `镜 ${i + 1}`}</em> {s.voiceover}
                </li>
              ))}
              <li>
                <em className={styles.shotLine}>结尾</em> {project.script.cta}
              </li>
            </ol>
            <div className={styles.reviewActions}>
              <button className={styles.go} type="button" disabled={confirmingCopy} onClick={() => void confirmCopy()}>
                {confirmingCopy ? "接下来写分镜…" : "确认文案，写图片分镜"}
              </button>
              <button className={styles.ratio} type="button" disabled={confirmingCopy} onClick={() => void rewriteCopy()}>
                重写文案
              </button>
            </div>
          </div>
        )}

        {reviewingBoard && project.script && (
          <div className={styles.copyReview}>
            <p className={styles.voiceLabel}>
              图片分镜
              <small>先确认这些场景描述，再按描述出图</small>
            </p>
            <ol className={styles.shots}>
              {project.script.shots.map((s, i) => (
                <li key={i}>
                  <em className={styles.shotLine}>{s.onScreenText || `镜 ${i + 1}`}</em>
                  {s.imagePrompt || s.scene}
                </li>
              ))}
            </ol>
            <div className={styles.reviewActions}>
              <button className={styles.go} type="button" disabled={confirmingCopy} onClick={() => void confirmCopy()}>
                {confirmingCopy ? "开始出图…" : "确认分镜，开始出图"}
              </button>
              <button className={styles.ratio} type="button" disabled={confirmingCopy} onClick={() => void rewriteCopy()}>
                重写分镜
              </button>
            </div>
          </div>
        )}

        {slots === 0 ? (
          !reviewingCopy && !reviewingBoard && !reviewingStills && !writingCopy && !writingBoard ? (
            <div className={styles.empty}>
              <p>分镜墙</p>
              <small>分镜文字定了之后，这里会按描述出图</small>
            </div>
          ) : null
        ) : (
          <div
            className={`${styles.wall} ${
              project.aspect === "16:9" ? styles.wallWide : project.aspect === "1:1" ? styles.wallSq : styles.wallTall
            }`}
          >
            {Array.from({ length: slots }, (_, i) => {
              const src = project.stillUrls[i];
              const shot = project.script?.shots[i];
              const board = shot ? shotBoardText(shot) : "";
              const canRedo =
                Boolean(src) && (reviewingStills || project.status === "ready") && !producing && !regening;
              return (
                <figure key={src || `slot-${i}`} className={styles.poster}>
                  <div className={`${styles.frame} ${posterClass(project.aspect)}`}>
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt={board || shot?.onScreenText || `镜 ${i + 1}`} />
                    ) : (
                      <div className={styles.waiting}>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <small>出图中</small>
                      </div>
                    )}
                  </div>
                  <figcaption>
                    <div className={styles.posterHead}>
                      <strong>{shot?.onScreenText || `镜 ${i + 1}`}</strong>
                      {src && (reviewingStills || project.status === "ready" || project.regenShotIndex === i) ? (
                        <button
                          className={styles.redo}
                          type="button"
                          disabled={!canRedo || confirmingCopy}
                          onClick={() => void regenProjectStill(i)}
                        >
                          {project.regenShotIndex === i ? "正在重做" : "重做这张"}
                        </button>
                      ) : null}
                    </div>
                    {shot ? (
                      <small>
                        {shot.durationSec}秒
                        {shot.scene ? ` · ${shot.scene}` : ""}
                      </small>
                    ) : null}
                    {board ? <p className={styles.posterPrompt}>{board}</p> : null}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}

        {reviewingStills && (
          <div className={styles.reviewActions}>
            <button
              className={styles.go}
              type="button"
              disabled={confirmingCopy || (project.stillUrls.length || 0) < shotCount}
              onClick={() => void confirmCopy()}
            >
              {confirmingCopy ? "接下来生成口播…" : "确认画面，继续成片"}
            </button>
          </div>
        )}

        {project.script && !reviewingCopy && !reviewingBoard && !reviewingStills && (
          <ol className={styles.shots}>
            <li>
              <em className={styles.shotLine}>钩子</em> {project.script.hook}
            </li>
            {project.script.shots.map((s, i) => (
              <li key={i}>
                <em className={styles.shotLine}>{s.onScreenText || `镜 ${i + 1}`}</em> {s.voiceover || s.scene}
              </li>
            ))}
          </ol>
        )}

        {project.finalUrl && <video className={styles.video} src={project.finalUrl} controls playsInline />}

        {project.htmlPath && (
          <div className={styles.cutActions}>
            <button className={styles.go} type="button" disabled={openingEdit || producing} onClick={() => void openTimeline()}>
              {openingEdit ? "正在打开时间轴…" : editUrl ? "刷新时间轴" : "微调成片"}
            </button>
            <button
              className={styles.ghost}
              type="button"
              disabled={reassembling || producing || !project.htmlPath}
              onClick={() => void assembleAgain()}
            >
              {reassembling || project.phase === "assemble" ? "正在按时间轴出片…" : "按时间轴再出片"}
            </button>
            {editUrl && (
              <a className={styles.editLink} href={editUrl} target="_blank" rel="noreferrer">
                在新窗口打开时间轴
              </a>
            )}
            {editUrl && <iframe className={styles.timeline} title="时间轴" src={editUrl} />}
          </div>
        )}
      </div>
    </section>
  );
}
