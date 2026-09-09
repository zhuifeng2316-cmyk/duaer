"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ASPECTS, type Aspect } from "@/lib/aspect";
import { DURATION_PRESETS } from "@/lib/board";
import {
  extForVoiceMime,
  finishVoiceRecord,
  MIN_VOICE_SEC,
  pickRecorderMime,
  recorderStillFlushing,
} from "@/lib/voice";
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

type Shot = { scene: string; imagePrompt?: string; onScreenText: string; voiceover: string; durationSec: number; motion: string };

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
  draftText?: string;
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
  const [charNameEdit, setCharNameEdit] = useState("");
  const [confirmingCopy, setConfirmingCopy] = useState(false);
  const [voiceName, setVoiceName] = useState("");
  const [nameEdits, setNameEdits] = useState<Record<string, string>>({});
  const [savingCharacter, setSavingCharacter] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [recState, setRecState] = useState<"idle" | "recording" | "preview">("idle");
  const [recSec, setRecSec] = useState(0);
  const [recHint, setRecHint] = useState("");
  const [recStopping, setRecStopping] = useState(false);
  const [voiceSavedHint, setVoiceSavedHint] = useState("");
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
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recStreamRef = useRef<MediaStream | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recStartedAtRef = useRef(0);
  const recLiveRef = useRef(false);
  const recMimeRef = useRef("audio/webm");
  const recStopTimerRef = useRef(0);

  const producing =
    busy || project?.status === "queued" || project?.status === "running";
  const reviewingCopy = project?.status === "review" && project.phase !== "board";
  const reviewingBoard = project?.status === "review" && project.phase === "board";
  const writingCopy = producing && (project?.phase === "copy" || !project?.phase || project?.phase === "idle");
  const writingBoard = producing && project?.phase === "board";
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
  const recPreviewUrl = useMemo(() => (voiceBlob ? URL.createObjectURL(voiceBlob) : null), [voiceBlob]);
  useEffect(() => () => {
    if (recPreviewUrl) URL.revokeObjectURL(recPreviewUrl);
  }, [recPreviewUrl]);

  useEffect(() => {
    if (recState !== "recording") return;
    const t = setInterval(() => {
      setRecSec(Math.max(0, Math.floor((Date.now() - recStartedAtRef.current) / 1000)));
    }, 250);
    return () => clearInterval(t);
  }, [recState]);

  useEffect(() => {
    return () => {
      window.clearTimeout(recStopTimerRef.current);
      recStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    };
  }, []);

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
      if (data.character) {
        setCharacterDetail(data.character);
        setCharNameEdit(data.character.name || "");
      }
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

  async function renameSavedCharacter(name: string) {
    if (!characterDetail) return;
    try {
      const res = await fetch(`/api/characters/${characterDetail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "起名失败");
      if (data.character) {
        setCharacterDetail(data.character);
        setCharNameEdit(data.character.name);
      }
      const listRes = await fetch("/api/characters", { cache: "no-store" });
      const listData = await listRes.json();
      if (Array.isArray(listData.characters)) setCharacters(listData.characters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "起名失败");
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

  async function startVoiceRecord() {
    if (recState === "recording" || producing) return;
    window.clearTimeout(recStopTimerRef.current);
    setError("");
    setRecHint("");
    setVoiceSavedHint("");
    setRecStopping(false);
    setVoiceBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recStreamRef.current = stream;
      recChunksRef.current = [];
      recLiveRef.current = true;
      const mime = pickRecorderMime((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type));
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recMimeRef.current = rec.mimeType || mime || "audio/webm";
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) recChunksRef.current.push(e.data);
      };
      rec.onerror = () => {
        setRecHint("录音中断了，请再录一次");
        finishVoiceCapture();
      };
      rec.onstop = () => {
        recMimeRef.current = rec.mimeType || recMimeRef.current;
      };
      recStartedAtRef.current = Date.now();
      try {
        rec.start(250);
      } catch {
        rec.start();
      }
      recMimeRef.current = rec.mimeType || recMimeRef.current;
      setRecSec(0);
      setRecState("recording");
    } catch {
      recLiveRef.current = false;
      setRecStopping(false);
      setRecHint("打不开麦克风，请允许录音");
      setError("打不开麦克风，请允许录音");
      setRecState("idle");
    }
  }

  function finishVoiceCapture() {
    if (!recLiveRef.current) return;
    recLiveRef.current = false;
    window.clearTimeout(recStopTimerRef.current);
    recStreamRef.current?.getTracks().forEach((track) => track.stop());
    recStreamRef.current = null;
    recorderRef.current = null;
    const sec = (Date.now() - recStartedAtRef.current) / 1000;
    const result = finishVoiceRecord(recChunksRef.current, recMimeRef.current, sec);
    setRecStopping(false);
    setRecSec(Math.max(0, Math.round(sec)));
    if (!result.blob) {
      setVoiceBlob(null);
      setRecState("idle");
      setRecHint(result.error || "没录上声音，请再录一次");
      return;
    }
    setVoiceBlob(result.blob);
    setRecState("preview");
    setRecHint(result.error || "");
  }

  function waitForVoiceFlush(startedAt: number) {
    if (!recLiveRef.current) return;
    const rec = recorderRef.current;
    const waited = Date.now() - startedAt;
    const hasChunks = recChunksRef.current.some((part) => part.size > 0);
    if (recorderStillFlushing(rec?.state, waited, hasChunks)) {
      recStopTimerRef.current = window.setTimeout(() => waitForVoiceFlush(startedAt), 80);
      return;
    }
    finishVoiceCapture();
  }

  function stopVoiceRecord() {
    if (recStopping) return;
    if (!recLiveRef.current && recState !== "recording") return;
    setRecStopping(true);
    setRecHint("");
    const rec = recorderRef.current;
    window.clearTimeout(recStopTimerRef.current);
    if (rec && rec.state !== "inactive") {
      try {
        rec.requestData();
      } catch {
        /* Safari may not implement requestData */
      }
      try {
        rec.stop();
      } catch {
        finishVoiceCapture();
        return;
      }
    }
    waitForVoiceFlush(Date.now());
  }

  async function saveVoice() {
    if (!voiceBlob || savingVoice || recHint) return;
    setSavingVoice(true);
    setError("");
    try {
      const ext = extForVoiceMime(voiceBlob.type);
      const file = new File([voiceBlob], `sample.${ext}`, { type: voiceBlob.type || "audio/webm" });
      const form = new FormData();
      form.set("name", voiceName);
      form.append("voice", file);
      const res = await fetch("/api/voices", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存音色失败");
      const listRes = await fetch("/api/voices");
      const listData = await listRes.json();
      if (Array.isArray(listData.voices)) setVoices(listData.voices);
      if (data.voice?.id) setSelectedVoiceId(data.voice.id);
      setVoiceBlob(null);
      setRecState("idle");
      setRecSec(0);
      setRecHint("");
      setVoiceSavedHint(`已存成「${data.voice?.name || "我的音色"}」，可试听。出片时用这条声音念口播`);
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
  const showImageWall =
    (project?.stillUrls.length || 0) > 0 ||
    Boolean(producing && project && ["images", "speech", "music", "html", "assemble"].includes(project.phase));
  const slots = showImageWall ? Math.max(shotCount, project?.stillUrls.length || 0) : 0;
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
        <div className={styles.rail}>
          <section className={styles.hero}>
            <h1 className={styles.heroTitle}>
              你也可以
              <br />
              拍摄大片
            </h1>
            <p className={styles.lede}>
              专门做口播。先写要讲什么，再写口播文案，确认后再写图片分镜文字，确认这些场景描述后才出图，然后生成口播和配乐，写合成稿再成片。照片克隆画面，人物和音色都能复用，你不用出镜拍摄。
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
              <small>在线录音克隆，建好后每条口播都能用</small>
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
              <>
                <audio
                  className={styles.voicePreview}
                  src={selectedVoice.sampleUrl}
                  controls
                  preload="metadata"
                />
                <p className={styles.hint}>
                  {voiceSavedHint || `可试听「${selectedVoice.name}」。出片时用这条声音念口播`}
                </p>
              </>
            )}
            <input
              className={styles.idea}
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              placeholder="新音色名，比如「我」"
              maxLength={16}
            />
            <div className={styles.recRow}>
              {recState === "recording" ? (
                <button
                  className={styles.ratio}
                  type="button"
                  disabled={recStopping}
                  onClick={() => stopVoiceRecord()}
                >
                  {recStopping ? "正在停下…" : "停录"}
                </button>
              ) : (
                <button
                  className={styles.ratio}
                  type="button"
                  disabled={producing}
                  onClick={() => void startVoiceRecord()}
                >
                  {recState === "preview" ? "重录" : "开始录音"}
                </button>
              )}
              <span className={styles.hint}>
                {recState === "recording"
                  ? recStopping
                    ? "正在取出刚才录的声音"
                    : `正在录 ${recSec} 秒 · 至少 ${MIN_VOICE_SEC} 秒`
                  : recState === "preview"
                    ? `已录 ${recSec} 秒，可试听再保存`
                    : "对着麦克风说 10 秒以上，在线克隆音色"}
              </span>
            </div>
            {recHint && <p className={styles.err}>{recHint}</p>}
            {recPreviewUrl && recState === "preview" && (
              <audio className={styles.voicePreview} src={recPreviewUrl} controls preload="metadata" />
            )}
            <button
              className={styles.ratio}
              type="button"
              disabled={savingVoice || recState !== "preview" || !voiceBlob || Boolean(recHint)}
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
            placeholder="先写这条口播要讲什么，确认文案后会写分镜文字，确认分镜后才出图"
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

          <button className={styles.go} type="submit" disabled={producing || reviewingCopy || reviewingBoard}>
            {producing
              ? writingBoard
                ? "正在写分镜…"
                : writingCopy
                  ? "正在写文案…"
                  : "正在出片…"
              : reviewingBoard
                ? "先确认右边的分镜"
                : reviewingCopy
                  ? "先确认右边的文案"
                  : "先写文案"}
          </button>
          {error && <p className={styles.err}>{error}</p>}
        </form>
        </div>

        <section className={styles.stage} aria-live="polite">
          <div className={styles.panel}>
            {!showProject && !showTurn && !showCharacter && (
              <div className={styles.empty}>
                    <p>分镜墙</p>
                    <small>文案定了之后，这里先出分镜文字，确认后再出图。也可先点开已保存的人物，看八个方位</small>
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
                    <input
                      className={styles.nameInput}
                      value={charNameEdit}
                      maxLength={16}
                      aria-label="人物名"
                      placeholder="给这个人起个名字"
                      onChange={(e) => setCharNameEdit(e.target.value)}
                      onBlur={(e) => void renameSavedCharacter(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                    />
                    <b>{characterDetail.message || "八个方位收在这个人下面"}</b>
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
                      <button
                        className={styles.go}
                        type="button"
                        disabled={confirmingCopy}
                        onClick={() => void confirmCopy()}
                      >
                        {confirmingCopy ? "接下来写分镜…" : "确认文案，写图片分镜"}
                      </button>
                      <button
                        className={styles.ratio}
                        type="button"
                        disabled={confirmingCopy}
                        onClick={() => void rewriteCopy()}
                      >
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
                      <button
                        className={styles.go}
                        type="button"
                        disabled={confirmingCopy}
                        onClick={() => void confirmCopy()}
                      >
                        {confirmingCopy ? "开始出图…" : "确认分镜，开始出图"}
                      </button>
                      <button
                        className={styles.ratio}
                        type="button"
                        disabled={confirmingCopy}
                        onClick={() => void rewriteCopy()}
                      >
                        重写分镜
                      </button>
                    </div>
                  </div>
                )}

                {slots === 0 ? (
                  !reviewingCopy && !reviewingBoard && !writingCopy && !writingBoard ? (
                  <div className={styles.empty}>
                    <p>分镜墙</p>
                    <small>分镜文字定了之后，这里会按描述出图</small>
                  </div>
                  ) : null
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
                                <small>出图中</small>
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

                {project.script && !reviewingCopy && !reviewingBoard && (
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
