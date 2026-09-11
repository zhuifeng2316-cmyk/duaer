"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { CaptionRecommendation, GraphicRecommendation } from "@/lib/talk-assist-shared";
import { TalkAssistPanel } from "../../talk-assist";
import { TalkWorkspace } from "../../talk-workspace";
import type { AssistShotPreview } from "../../assist-caption-recs";
import styles from "../../page.module.css";

function posterClass(aspect: string): string {
  if (aspect === "1:1") return styles.sq;
  if (aspect === "16:9") return styles.wide;
  if (aspect === "4:3") return styles.classic;
  if (aspect === "3:4") return styles.photo;
  return styles.tall;
}

export type AssistApplyFocus = { kind: "shot" | "all"; shotIndex?: number; tick: number };

export default function TalkDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");
  const [recommendations, setRecommendations] = useState<CaptionRecommendation[]>([]);
  const [graphics, setGraphics] = useState<GraphicRecommendation[]>([]);
  const [shots, setShots] = useState<AssistShotPreview[]>([]);
  const [aspect, setAspect] = useState("9:16");
  const [projectTick, setProjectTick] = useState(0);
  const [applyFocus, setApplyFocus] = useState<AssistApplyFocus | null>(null);
  const [projectPatch, setProjectPatch] = useState<unknown>(null);

  const loadShots = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { cache: "no-store" });
      const data = await res.json();
      const project = data.project;
      if (!project) return;
      setAspect(String(project.aspect || "9:16"));
      const stills: string[] = Array.isArray(project.stillUrls) ? project.stillUrls : [];
      const scriptShots = Array.isArray(project.script?.shots) ? project.script.shots : [];
      const next: AssistShotPreview[] = scriptShots.map((shot: { onScreenText?: string; voiceover?: string }, i: number) => ({
        stillUrl: typeof stills[i] === "string" ? stills[i]! : "",
        text: shot.onScreenText || shot.voiceover || project.script?.hook || project.idea || "口播字",
      }));
      if (!next.length && stills.length) {
        setShots(
          stills.map((stillUrl: string) => ({
            stillUrl: stillUrl || "",
            text: project.script?.hook || project.idea || "口播字",
          })),
        );
      } else {
        setShots(next);
      }
    } catch {
      /* 预览稍后补 */
    }
  }, [id]);

  useEffect(() => {
    void loadShots();
  }, [loadShots]);

  const frameClass = useMemo(() => posterClass(aspect), [aspect]);

  function handleApplied(target: { kind: "shot" | "all"; shotIndex?: number }, project?: unknown) {
    if (project) setProjectPatch({ project, tick: Date.now() });
    setProjectTick((n) => n + 1);
    setApplyFocus({ ...target, tick: Date.now() });
  }

  if (!id) {
    return (
      <div className={styles.world}>
        <p className={styles.err}>找不到这条口播</p>
      </div>
    );
  }

  return (
    <div className={styles.world}>
      <div className={`${styles.layout} ${styles.talkLayout}`}>
        <div className={styles.rail}>
          <TalkAssistPanel
            talkId={id}
            recommendations={recommendations}
            graphics={graphics}
            onRecommendations={setRecommendations}
            onGraphics={setGraphics}
            onApplied={handleApplied}
            shots={shots}
            frameClass={frameClass}
          />
        </div>
        <div className={styles.talkFrame}>
          <TalkWorkspace
            talkId={id}
            assistRecommendations={recommendations}
            assistGraphics={graphics}
            assistShots={shots}
            assistFrameClass={frameClass}
            assistRefreshTick={projectTick}
            assistApplyFocus={applyFocus}
            assistProjectPatch={projectPatch}
            onAssistApply={handleApplied}
          />
        </div>
      </div>
    </div>
  );
}
