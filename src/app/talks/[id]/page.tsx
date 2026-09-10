"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { CaptionRecommendation } from "@/lib/talk-assist";
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

export default function TalkDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");
  const [recommendations, setRecommendations] = useState<CaptionRecommendation[]>([]);
  const [shots, setShots] = useState<AssistShotPreview[]>([]);
  const [aspect, setAspect] = useState("9:16");
  const [refreshTick, setRefreshTick] = useState(0);

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
  }, [loadShots, refreshTick]);

  const frameClass = useMemo(() => posterClass(aspect), [aspect]);

  if (!id) {
    return (
      <div className={styles.world}>
        <p className={styles.err}>找不到这条口播</p>
      </div>
    );
  }

  return (
    <div className={styles.world}>
      <div className={styles.layout}>
        <div className={styles.rail}>
          <TalkAssistPanel
            talkId={id}
            recommendations={recommendations}
            onRecommendations={setRecommendations}
            onApplied={() => setRefreshTick((n) => n + 1)}
            shots={shots}
            frameClass={frameClass}
          />
        </div>
        <div className={styles.talkFrame}>
          <TalkWorkspace
            talkId={id}
            assistRecommendations={recommendations}
            assistShots={shots}
            assistFrameClass={frameClass}
            assistRefreshTick={refreshTick}
            onAssistApply={() => setRefreshTick((n) => n + 1)}
          />
        </div>
      </div>
    </div>
  );
}
