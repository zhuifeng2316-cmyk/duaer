"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ASPECTS, type Aspect } from "@/lib/aspect";
import { DURATION_PRESETS } from "@/lib/board";
import styles from "./page.module.css";

type PublicVoice = {
  id: string;
  name: string;
  createdAt: string;
  sampleUrl: string;
};

type PublicCharacter = {
  id: string;
  name: string;
  createdAt: string;
  enhanced: boolean;
  viewCount: number;
  status?: string;
  thumbUrl: string | null;
};

type CharacterDetail = {
  id: string;
  name: string;
  status: string;
  progress: number;
  message: string;
  error: string | null;
  regenViewId: string | null;
  viewCount: number;
  views: { id: string; label: string; url: string | null }[];
};

type PublicTurn = {
  id: string;
  status: string;
  progress: number;
  message: string;
  error: string | null;
  sourceUrl?: string | null;
  cropUrl?: string | null;
  headUrl?: string | null;
  enhanced?: boolean;
  faces?: {
    id: string;
    label: string;
    url: string | null;
    cropUrl?: string | null;
    selected: boolean;
    enhanced: boolean;
  }[];
  views: { id: string; label: string; url: string | null }[];
  regenViewId?: string | null;
};

type Shot = { scene: string; onScreenText: string; voiceover: string; durationSec: number; motion: string };

type PublicProject = {
  id: string;
  idea: string;
  aspect: Aspect;
  status: string;
  phase: string;
  progress: number;
  message: string;
  error: string | null;
  musicError: string | null;
  speechError: string | null;
  script: { hook: string; cta: string; shots: Shot[] } | null;
  stillUrls: string[];
  finalUrl: string | null;
};

function posterClass(aspect: Aspect): string {
  if (aspect === "1:1") return styles.sq;
  if (aspect === "16:9") return styles.wide;
  return styles.tall;
}

export default function HomePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [voices, setVoices] = useState<PublicVoice[]>([]);
  const [characters, setCharacters] = useState<PublicCharacter[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [inspectCharacterId, setInspectCharacterId] = useState("");
  const [characterDetail, setCharacterDetail] = useState<CharacterDetail | null>(null);
  const [voiceName, setVoiceName] = useState("");
  const [nameEdits, setNameEdits] = useState<Record<string, string>>({});
  const [savingCharacter, setSavingCharacter] = useState(false);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [savingVoice, setSavingVoice] = useState(false);
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [durationSec, setDurationSec] = useState(15);
  const [idea, setIdea] = useState("");
  const [look, setLook] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [project, setProject] = useState<PublicProject | null>(null);
  const [turn, setTurn] = useState<PublicTurn | null>(null);
  const [splitting, setSplitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [enhancingHead, setEnhancingHead] = useState(false);
  const submitting = useRef(false);

  const producing =
    busy || project?.status === "queued" || project?.status === "running";
  const cutting =
    splitting || turn?.status === "cutting" || (turn?.status === "queued" && !turn.headUrl);
  const expanding = turn?.status === "running";
  const rerunning = turn?.status === "rerunning";
  const reviewing = turn?.status === "review";
  const enhancing = enhancingHead || turn?.status === "enhancing";

  useEffect(() => {
    void (async () => {
      const [voiceRes, charRes] = await Promise.all([
        fetch("/api/voices", { cache: "no-store" }),
        fetch("/api/characters", { cache: "no-store" }),
      ]);
      const voiceData = await voiceRes.json();
      const charData = await charRes.json();
      if (Array.isArray(voiceData.voices)) setVoices(voiceData.voices);
      if (voiceData.lastVoiceId) setSelectedVoiceId(String(voiceData.lastVoiceId));
      if (Array.isArray(charData.characters)) setCharacters(charData.characters);
      if (Array.isArray(charData.lastCharacterIds) && charData.lastCharacterIds.length) {
        const ids = charData.lastCharacterIds.map(String);
        setSelectedCharacterIds(ids);
        setInspectCharacterId(ids[0] || "");
      }
    })();
  }, []);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  useEffect(() => {
    if (!project?.id) return;
    if (project.status === "ready" || project.status === "failed") return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/projects/${project.id}`);
      const data = await res.json();
      if (data.project) setProject(data.project);
    }, 1000);
    return () => clearInterval(t);
  }, [project?.id, project?.status]);

  useEffect(() => {
    if (!turn?.id) return;
    if (turn.status === "ready" || turn.status === "failed" || turn.status === "review") return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/turns/${turn.id}`);
      const data = await res.json();
      if (data.turn) setTurn(data.turn);
    }, 1000);
    return () => clearInterval(t);
  }, [turn?.id, turn?.status]);

  useEffect(() => {
    if (!inspectCharacterId) {
      setCharacterDetail(null);
      return;
    }
    void (async () => {
      const res = await fetch(`/api/characters/${inspectCharacterId}`, { cache: "no-store" });
      const data = await res.json();
      if (data.character) setCharacterDetail(data.character);
    })();
  }, [inspectCharacterId]);

  useEffect(() => {
    if (!characterDetail?.id) return;
    if (characterDetail.status === "ready" || characterDetail.status === "failed") return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/characters/${characterDetail.id}`, { cache: "no-store" });
      const data = await res.json();
      if (data.character) setCharacterDetail(data.character);
    }, 1000);
    return () => clearInterval(t);
  }, [characterDetail?.id, characterDetail?.status]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current || producing) return;
    setError("");
    if (!files.length && !selectedCharacterIds.length) {
      setError("先上传至少一张人物照片，或选用已保存的人物");
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const form = new FormData();
      form.set("idea", idea);
      form.set("look", look);
      form.set("aspect", aspect);
      form.set("durationSec", String(durationSec));
      for (const f of files) form.append("photos", f);
      for (const id of selectedCharacterIds) form.append("characterIds", id);
      if (selectedVoiceId) form.set("voiceId", selectedVoiceId);
      else if (voiceFile) {
        form.append("voice", voiceFile);
        form.set("voiceName", voiceName);
      }
      const res = await fetch("/api/projects", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失败");
      setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function splitAngles() {
    if (cutting || expanding || enhancing || producing) return;
    setError("");
    const photo = files[0];
    if (!photo) {
      setError("先上传一张人物照片");
      return;
    }
    setSplitting(true);
    try {
      const form = new FormData();
      form.set("photo", photo);
      const res = await fetch("/api/turns", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "抠头像失败");
      setTurn(data.turn);
    } catch (err) {
      setError(err instanceof Error ? err.message : "抠头像失败");
    } finally {
      setSplitting(false);
    }
  }

  async function confirmHead() {
    if (!turn || turn.status !== "review" || confirming) return;
    setError("");
    setConfirming(true);
    try {
      const res = await fetch(`/api/turns/${turn.id}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "确认失败");
      setTurn(data.turn);
    } catch (err) {
      setError(err instanceof Error ? err.message : "确认失败");
    } finally {
      setConfirming(false);
    }
  }

  async function enhanceHead() {
    if (!turn || turn.status !== "review" || enhancingHead) return;
    setError("");
    setEnhancingHead(true);
    try {
      const res = await fetch(`/api/turns/${turn.id}/enhance`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "高清失败");
      setTurn(data.turn);
    } catch (err) {
      setError(err instanceof Error ? err.message : "高清失败");
    } finally {
      setEnhancingHead(false);
    }
  }

  async function regenView(viewId: string) {
    if (!turn || turn.status !== "ready") return;
    setError("");
    try {
      const res = await fetch(`/api/turns/${turn.id}/regen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "重做失败");
      if (data.turn) setTurn(data.turn);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重做失败");
    }
  }

  async function useEightAsPhotos() {
    if (!turn || turn.status !== "ready") return;
    const next: File[] = [];
    for (const v of turn.views) {
      if (!v.url) continue;
      const res = await fetch(v.url);
      if (!res.ok) continue;
      const blob = await res.blob();
      next.push(new File([blob], `${v.id}.png`, { type: blob.type || "image/png" }));
    }
    if (next.length) setFiles(next.slice(0, 8));
  }

  async function toggleFace(id: string) {
    if (!turn || turn.status !== "review") return;
    const faces = turn.faces || [];
    const selected = faces.filter((f) => (f.id === id ? !f.selected : f.selected)).map((f) => f.id);
    setTurn({
      ...turn,
      faces: faces.map((f) => (f.id === id ? { ...f, selected: !f.selected } : f)),
    });
    try {
      const res = await fetch(`/api/turns/${turn.id}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "选人失败");
      if (data.turn) setTurn(data.turn);
    } catch (err) {
      setError(err instanceof Error ? err.message : "选人失败");
    }
  }

  async function useSelectedAsPhotos() {
    if (!turn) return;
    const chosen = (turn.faces || []).filter((f) => f.selected && f.url);
    if (!chosen.length) {
      setError("先点选至少一个人");
      return;
    }
    const next: File[] = [];
    for (const f of chosen) {
      const res = await fetch(f.url!);
      if (!res.ok) continue;
      const blob = await res.blob();
      next.push(new File([blob], `${f.id}.png`, { type: blob.type || "image/png" }));
    }
    if (next.length) setFiles(next.slice(0, 8));
  }

  async function saveVoice() {
    if (!voiceFile || savingVoice) return;
    setSavingVoice(true);
    setError("");
    try {
      const form = new FormData();
      form.set("name", voiceName);
      form.append("voice", voiceFile);
      const res = await fetch("/api/voices", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存音色失败");
      const listRes = await fetch("/api/voices");
      const listData = await listRes.json();
      if (Array.isArray(listData.voices)) setVoices(listData.voices);
      if (data.voice?.id) setSelectedVoiceId(data.voice.id);
      setVoiceFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存音色失败");
    } finally {
      setSavingVoice(false);
    }
  }

  function faceName(face: { id: string; label: string }): string {
    return nameEdits[face.id] ?? face.label;
  }

  async function renameFace(faceId: string, name: string) {
    if (!turn) return;
    try {
      const res = await fetch(`/api/turns/${turn.id}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceId, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "起名失败");
      if (data.turn) setTurn(data.turn);
    } catch (err) {
      setError(err instanceof Error ? err.message : "起名失败");
    }
  }

  async function saveCharacters() {
    if (!turn || savingCharacter) return;
    setSavingCharacter(true);
    setError("");
    try {
      const focus = (turn.faces || []).find((f) => f.selected) || turn.faces?.[0];
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turnId: turn.id,
          name: focus ? faceName(focus) : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存人物失败");
      const listRes = await fetch("/api/characters");
      const listData = await listRes.json();
      if (Array.isArray(listData.characters)) setCharacters(listData.characters);
      const ids = Array.isArray(data.characters) ? data.characters.map((c: { id: string }) => c.id) : [];
      if (ids.length) {
        setSelectedCharacterIds(ids);
        setInspectCharacterId(ids[0]!);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存人物失败");
    } finally {
      setSavingCharacter(false);
    }
  }

  function toggleCharacter(id: string) {
    setInspectCharacterId(id);
    setSelectedCharacterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function expandInspectedCharacter() {
    if (!characterDetail || characterDetail.status !== "ready") return;
    setError("");
    try {
      const res = await fetch(`/api/characters/${characterDetail.id}/expand`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      if (data.character) setCharacterDetail(data.character);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    }
  }

  async function regenCharacterView(viewId: string) {
    if (!characterDetail || characterDetail.status !== "ready") return;
    setError("");
    try {
      const res = await fetch(`/api/characters/${characterDetail.id}/regen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "重做失败");
      if (data.character) setCharacterDetail(data.character);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重做失败");
    }
  }

  const selectedVoice = voices.find((v) => v.id === selectedVoiceId);
  const charExpanding = characterDetail?.status === "expanding";
  const charRerunning = characterDetail?.status === "rerunning";
  const turnBusy = cutting || expanding || reviewing || enhancing || rerunning;
  const showProject = Boolean(project);
  const showTurn = Boolean(turn) && (turnBusy || !characterDetail);
  const showCharacter = Boolean(characterDetail) && !showProject && !showTurn;

  const shotCount = project?.script?.shots.length || 0;
  const slots = Math.max(shotCount, project?.stillUrls.length || 0);
  const turnFaces = turn?.faces || [];
  const focusFace = turnFaces.find((f) => f.selected) || turnFaces[0];
  const focusUrl = focusFace?.url || turn?.headUrl || null;
  const focusSrc = focusUrl
    ? `${focusUrl}${focusUrl.includes("?") ? "&" : "?"}v=${focusFace?.enhanced ? "hd" : "crop"}`
    : null;
  const focusCrop = focusFace?.cropUrl || turn?.cropUrl || null;
  const focusCropSrc = focusCrop ? `${focusCrop}${focusCrop.includes("?") ? "&" : "?"}v=crop` : null;

  return (
    <div className={styles.world}>
      <header className={styles.top}>
        <p className={styles.mark}>Duaer</p>
        <span className={styles.topNote}>人不出镜 · 克隆音色 · 克隆画面</span>
      </header>

      <div className={project || turn || characterDetail ? styles.live : styles.layout}>
        <div>
          <section className={styles.hero}>
            <h1 className={styles.heroTitle}>
              你也可以
              <br />
              拍摄大片
            </h1>
            <p className={styles.lede}>
              专门做口播。先写文案，再定图片分镜，然后生成口播和配乐，写合成稿再成片。照片克隆画面，人物和音色都能复用，你不用出镜拍摄。
            </p>
          </section>
        <form className={styles.desk} onSubmit={onSubmit}>
          <label className={styles.upload}>
            <input
              className={styles.fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 8))}
            />
            <span>上传人物照片</span>
            <small className={styles.hint}>用来克隆画面 · 1–8 张。也可点选已保存的人物，不必每次重抠</small>
          </label>
          {previews.length > 0 && (
            <div className={styles.thumbs}>
              {previews.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.thumb} key={src} src={src} alt="人物参考" />
              ))}
            </div>
          )}
          <button
            className={styles.ratio}
            type="button"
            disabled={cutting || expanding || enhancing || producing || !files.length}
            onClick={() => void splitAngles()}
          >
            {cutting ? "正在抠头像…" : "先抠出头像"}
          </button>
          <div className={styles.voiceBox}>
            <p className={styles.voiceLabel}>
              人物形象
              <small>八个方位收在这个人下面，点开可重做</small>
            </p>
            {characters.length > 0 && (
              <div className={styles.aspects} role="group" aria-label="人物形象">
                {characters.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={
                      selectedCharacterIds.includes(c.id)
                        ? `${styles.ratio} ${styles.on} ${styles.charPick}`
                        : `${styles.ratio} ${styles.charPick}`
                    }
                    onClick={() => toggleCharacter(c.id)}
                  >
                    {c.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className={styles.charThumb} src={c.thumbUrl} alt="" />
                    ) : null}
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={styles.voiceBox}>
            <p className={styles.voiceLabel}>
              克隆音色
              <small>建好后每条口播都能用</small>
            </p>
            {voices.length > 0 && (
              <div className={styles.aspects} role="group" aria-label="克隆音色">
                {voices.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={selectedVoiceId === v.id ? `${styles.ratio} ${styles.on}` : styles.ratio}
                    onClick={() => setSelectedVoiceId(v.id)}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            )}
            {selectedVoice && (
              <audio className={styles.voicePreview} src={selectedVoice.sampleUrl} controls preload="none" />
            )}
            <input
              className={styles.idea}
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              placeholder="新音色名，比如「我」"
              maxLength={16}
            />
            <label className={styles.upload}>
              <input
                className={styles.fileInput}
                type="file"
                accept="audio/mpeg,audio/wav,audio/mp4,audio/webm,audio/x-m4a,audio/aac,.mp3,.wav,.m4a,.webm"
                onChange={(e) => setVoiceFile(e.target.files?.[0] || null)}
              />
              <span>上传说话录音</span>
              <small className={styles.hint}>
                {voiceFile ? voiceFile.name : "说 10 秒以上，存成可复用音色"}
              </small>
            </label>
            <button
              className={styles.ratio}
              type="button"
              disabled={savingVoice || !voiceFile}
              onClick={() => void saveVoice()}
            >
              {savingVoice ? "保存中…" : "存成音色"}
            </button>
          </div>

          <div className={styles.aspects} role="group" aria-label="画幅">
            {ASPECTS.map((a) => (
              <button
                key={a}
                type="button"
                className={aspect === a ? `${styles.ratio} ${styles.on}` : styles.ratio}
                onClick={() => setAspect(a)}
              >
                {a}
              </button>
            ))}
          </div>
          <div className={styles.aspects} role="group" aria-label="成片时长">
            {DURATION_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                className={durationSec === d ? `${styles.ratio} ${styles.on}` : styles.ratio}
                onClick={() => setDurationSec(d)}
              >
                {d}秒
              </button>
            ))}
          </div>

          <textarea
            className={styles.idea}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="这条口播要讲什么？"
            rows={3}
            required
            minLength={4}
          />
          <textarea
            className={styles.idea}
            value={look}
            onChange={(e) => setLook(e.target.value)}
            placeholder="气质补充，可空。成片默认就是电影大片：赛博雨夜、西部荒漠、宫廷烛光…"
            rows={2}
          />

          <button className={styles.go} type="submit" disabled={producing}>
            {producing ? "正在出片…" : "开始出片"}
          </button>
          {error && <p className={styles.err}>{error}</p>}
        </form>
        </div>

        <section className={styles.stage} aria-live="polite">
          <div className={styles.panel}>
            {!showProject && !showTurn && !showCharacter && (
              <div className={styles.empty}>
                <p>分镜墙</p>
                <small>文案定了之后，这里先铺分镜再出图。也可先点开已保存的人物，看八个方位</small>
              </div>
            )}
            {showTurn && turn && (
              <>
                <div className={styles.bar}>
                  <div>
                    <b>{turn.message}</b>
                    <i className={styles.meter} style={{ width: `${turn.progress}%` }} />
                  </div>
                  <span>
                    {turn.progress}%
                    {enhancing ? " · 高清" : reviewing || cutting ? " · 抠头像" : rerunning ? " · 重做" : " · 8 个角度"}
                  </span>
                </div>
                {turn.error && <p className={styles.err}>{turn.error}</p>}
                {(reviewing || cutting || enhancing) && (
                  <div className={styles.review}>
                    <div className={focusFace?.enhanced && focusCropSrc ? styles.reviewCompare : undefined}>
                      {focusFace?.enhanced && focusCropSrc && (
                        <figure className={`${styles.poster} ${styles.reviewHero}`}>
                          <div className={`${styles.frame} ${styles.sq}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={focusCropSrc} alt="抠出的原图" />
                          </div>
                          <figcaption>
                            <strong>原图</strong>
                            <small>抠出来的整张头像</small>
                          </figcaption>
                        </figure>
                      )}
                      <figure className={`${styles.poster} ${styles.reviewHero}`}>
                        <div className={`${styles.frame} ${styles.sq}`}>
                          {focusSrc ? (
                            focusFace?.enhanced ? (
                              <a href={focusSrc} target="_blank" rel="noreferrer" title="看原大">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={focusSrc} alt={focusFace?.label || "修好的头像"} />
                              </a>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={focusSrc} alt={focusFace?.label || "抠出的头像"} />
                            )
                          ) : (
                            <div className={styles.waiting}>
                              <span>头像</span>
                              <small>{enhancing ? "正在变高清" : "正在从原图裁出"}</small>
                            </div>
                          )}
                        </div>
                        <figcaption>
                          {focusFace ? (
                            <input
                              className={styles.nameInput}
                              value={faceName(focusFace)}
                              maxLength={16}
                              disabled={!reviewing && turn.status !== "ready"}
                              onChange={(e) =>
                                setNameEdits((prev) => ({ ...prev, [focusFace.id]: e.target.value }))
                              }
                              onBlur={(e) => void renameFace(focusFace.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              aria-label="人物名"
                              placeholder="给这个人起个名字"
                            />
                          ) : (
                            <strong>{focusFace?.enhanced ? "高清" : "抠出的头像"}</strong>
                          )}
                          <small>
                            {focusFace?.enhanced
                              ? "修的是左边这张整图，点开可看原大"
                              : turnFaces.length > 1
                                ? "大图预览，点下面小图切换人选，点名字能改"
                                : "点名字能改；点高清只修这张原图，不会换成别人"}
                          </small>
                        </figcaption>
                      </figure>
                    </div>
                    {turnFaces.length > 1 && (
                      <div className={styles.reviewFaces}>
                        {turnFaces.map((f) => (
                          <div
                            key={f.id}
                            className={`${styles.poster} ${styles.faceCard} ${f.selected ? styles.faceOn : ""}`}
                          >
                            <button
                              type="button"
                              className={styles.facePick}
                              disabled={!reviewing}
                              onClick={() => void toggleFace(f.id)}
                            >
                              <div className={`${styles.frame} ${styles.sq}`}>
                                {f.url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={`${f.url}${f.url.includes("?") ? "&" : "?"}v=${f.enhanced ? "hd" : "crop"}`}
                                    alt={faceName(f)}
                                  />
                                ) : (
                                  <div className={styles.waiting}>
                                    <span>{f.id}</span>
                                  </div>
                                )}
                              </div>
                            </button>
                            <figcaption>
                              <input
                                className={styles.nameInput}
                                value={faceName(f)}
                                maxLength={16}
                                disabled={!reviewing && turn.status !== "ready"}
                                onChange={(e) => setNameEdits((prev) => ({ ...prev, [f.id]: e.target.value }))}
                                onBlur={(e) => void renameFace(f.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                aria-label="人物名"
                              />
                              <small>{f.selected ? (f.enhanced ? "已选 · 高清" : "已选") : "未选"}</small>
                            </figcaption>
                          </div>
                        ))}
                      </div>
                    )}
                    {reviewing && (
                      <div className={styles.reviewActions}>
                        <button
                          className={styles.go}
                          type="button"
                          disabled={confirming || enhancing || !(turn.faces || []).some((f) => f.selected)}
                          onClick={() => void enhanceHead()}
                        >
                          {(turn.faces || []).some((f) => f.selected && f.enhanced)
                            ? "再修一次原图"
                            : "修选中头像的高清"}
                        </button>
                        <button
                          className={styles.ratio}
                          type="button"
                          disabled={confirming || enhancing || !(turn.faces || []).some((f) => f.selected)}
                          onClick={() => void useSelectedAsPhotos()}
                        >
                          用选中的人出片
                        </button>
                        <button
                          className={styles.ratio}
                          type="button"
                          disabled={
                            confirming ||
                            enhancing ||
                            (turn.faces || []).filter((f) => f.selected).length !== 1
                          }
                          onClick={() => void confirmHead()}
                        >
                          {confirming ? "开始出电影画面…" : "确认并出八张电影画面"}
                        </button>
                        <button
                          className={styles.ratio}
                          type="button"
                          disabled={confirming || enhancing || savingCharacter || !(turn.faces || []).some((f) => f.selected)}
                          onClick={() => void saveCharacters()}
                        >
                          {savingCharacter ? "保存中…" : "把选中的人存成人物"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {!reviewing && !cutting && !enhancing && (
                  <>
                    <div className={`${styles.wall} ${styles.wallEight}`}>
                      {turn.views.map((v, i) => (
                        <figure key={v.id} className={styles.poster}>
                          <div className={`${styles.frame} ${styles.tall}`}>
                            {v.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={v.url} alt={v.label} />
                            ) : (
                              <div className={styles.waiting}>
                                <span>{String(i + 1).padStart(2, "0")}</span>
                                <small>{v.label}</small>
                              </div>
                            )}
                          </div>
                          <figcaption>
                            <strong>{v.label}</strong>
                            {v.url && (turn.status === "ready" || turn.status === "rerunning") && (
                              <button
                                className={styles.redo}
                                type="button"
                                disabled={turn.status !== "ready"}
                                onClick={() => void regenView(v.id)}
                              >
                                {turn.regenViewId === v.id ? "正在重做" : "重做这张"}
                              </button>
                            )}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                    {(turn.status === "ready" || turn.status === "rerunning") && (
                      <div className={styles.reviewActions}>
                        <button
                          className={styles.ratio}
                          type="button"
                          disabled={rerunning || savingCharacter || !(turn.faces || []).some((f) => f.selected || f.url)}
                          onClick={() => void saveCharacters()}
                        >
                          {savingCharacter ? "保存中…" : "把这个人存成人物"}
                        </button>
                        <button
                          className={styles.go}
                          type="button"
                          disabled={rerunning}
                          onClick={() => void useEightAsPhotos()}
                        >
                          用这八张出片
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            {showCharacter && characterDetail && (
              <>
                <div className={styles.bar}>
                  <div>
                    <b>{characterDetail.message || characterDetail.name}</b>
                    <i className={styles.meter} style={{ width: `${characterDetail.progress || 0}%` }} />
                  </div>
                  <span>
                    {characterDetail.viewCount}/8 · 八个方位
                    {charRerunning ? " · 重做" : charExpanding ? " · 生成" : ""}
                  </span>
                </div>
                {characterDetail.error && <p className={styles.err}>{characterDetail.error}</p>}
                <div className={`${styles.wall} ${styles.wallEight}`}>
                  {characterDetail.views.map((v, i) => (
                    <figure key={v.id} className={styles.poster}>
                      <div className={`${styles.frame} ${styles.tall}`}>
                        {v.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.url} alt={v.label} />
                        ) : (
                          <div className={styles.waiting}>
                            <span>{String(i + 1).padStart(2, "0")}</span>
                            <small>{v.label}</small>
                          </div>
                        )}
                      </div>
                      <figcaption>
                        <strong>{v.label}</strong>
                        {v.url && characterDetail.status === "ready" && (
                          <button
                            className={styles.redo}
                            type="button"
                            disabled={characterDetail.viewCount < 8}
                            onClick={() => void regenCharacterView(v.id)}
                          >
                            {characterDetail.regenViewId === v.id ? "正在重做" : "重做这张"}
                          </button>
                        )}
                      </figcaption>
                    </figure>
                  ))}
                </div>
                {characterDetail.status === "ready" && characterDetail.viewCount < 8 && (
                  <div className={styles.reviewActions}>
                    <button className={styles.go} type="button" onClick={() => void expandInspectedCharacter()}>
                      生成八个方位
                    </button>
                  </div>
                )}
              </>
            )}
            {project && (
              <>
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
                {project.error && <p className={styles.err}>{project.error}</p>}
                {project.musicError && <p className={styles.warn}>配乐没加上：{project.musicError}</p>}
                {project.speechError && <p className={styles.warn}>口播没加上：{project.speechError}</p>}

                {slots === 0 ? (
                  <div className={styles.empty}>
                    <p>分镜墙</p>
                    <small>分镜定了之后，这里会铺开成墙</small>
                  </div>
                ) : (
                  <div
                    className={`${styles.wall} ${
                      project.aspect === "16:9"
                        ? styles.wallWide
                        : project.aspect === "1:1"
                          ? styles.wallSq
                          : styles.wallTall
                    }`}
                  >
                    {Array.from({ length: slots }, (_, i) => {
                      const src = project.stillUrls[i];
                      const shot = project.script?.shots[i];
                      return (
                        <figure key={src || `slot-${i}`} className={styles.poster}>
                          <div className={`${styles.frame} ${posterClass(project.aspect)}`}>
                            {src ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={src} alt={shot?.scene || `镜 ${i + 1}`} />
                            ) : (
                              <div className={styles.waiting}>
                                <span>{String(i + 1).padStart(2, "0")}</span>
                                <small>克隆中</small>
                              </div>
                            )}
                          </div>
                          <figcaption>
                            <strong>{shot?.onScreenText || `镜 ${i + 1}`}</strong>
                            {shot ? (
                              <small>
                                {shot.durationSec}秒
                                {shot.scene ? ` · ${shot.scene}` : ""}
                              </small>
                            ) : null}
                          </figcaption>
                        </figure>
                      );
                    })}
                  </div>
                )}

                {project.script && (
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

                {project.finalUrl && (
                  <video className={styles.video} src={project.finalUrl} controls playsInline />
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
