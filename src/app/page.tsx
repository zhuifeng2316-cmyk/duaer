"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ASPECTS, QUALITIES, type Aspect, type OutputQuality } from "@/lib/aspect";
import { pickStudioVoiceId } from "@/lib/house-voices";
import { DURATION_PRESETS } from "@/lib/board";
import {
  extForVoiceMime,
  finishVoiceRecord,
  MIN_VOICE_SEC,
  pickRecorderMime,
  recorderStillFlushing,
} from "@/lib/voice";
import { HomeWall } from "./home-wall";
import styles from "./page.module.css";

type PublicVoice = {
  id: string;
  name: string;
  createdAt: string;
  sampleUrl: string;
};

type PublicHouseVoice = {
  id: string;
  name: string;
  blurb: string;
  sampleUrl?: string;
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

type PublicBilling = {
  planName: string;
  remaining: number;
  allows4K: boolean;
};

export default function HomePage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [voices, setVoices] = useState<PublicVoice[]>([]);
  const [houseVoices, setHouseVoices] = useState<PublicHouseVoice[]>([]);
  const [characters, setCharacters] = useState<PublicCharacter[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [inspectCharacterId, setInspectCharacterId] = useState("");
  const [characterDetail, setCharacterDetail] = useState<CharacterDetail | null>(null);
  const [charNameEdit, setCharNameEdit] = useState("");
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
  const [quality, setQuality] = useState<OutputQuality>("2K");
  const [durationSec, setDurationSec] = useState(15);
  const [talkKind, setTalkKind] = useState<"knowledge" | "story">("knowledge");
  const [idea, setIdea] = useState("");
  const [look, setLook] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [billing, setBilling] = useState<PublicBilling | null>(null);
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
  const houseAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingHouseId, setPlayingHouseId] = useState("");
  const [houseHearHint, setHouseHearHint] = useState("");
  const [cloneOpen, setCloneOpen] = useState(false);

  const producing = busy;
  const needDailyFor4K = quality === "4K" && billing != null && !billing.allows4K;
  const cutting =
    splitting || turn?.status === "cutting" || (turn?.status === "queued" && !turn.headUrl);
  const expanding = turn?.status === "running";
  const rerunning = turn?.status === "rerunning";
  const reviewing = turn?.status === "review";
  const enhancing = enhancingHead || turn?.status === "enhancing";

  useEffect(() => {
    let cancelled = false;
    function applyBill(billData: { planName?: unknown; remaining?: unknown; allows4K?: unknown }) {
      setBilling({
        planName: String(billData.planName || "试做"),
        remaining: Number(billData.remaining) || 0,
        allows4K: Boolean(billData.allows4K),
      });
    }
    async function loadBill() {
      const res = await fetch("/api/billing", { cache: "no-store" });
      const billData = await res.json();
      if (cancelled || !res.ok || !billData) return;
      applyBill(billData);
    }
    void (async () => {
      const [voiceRes, charRes, billRes] = await Promise.all([
        fetch("/api/voices", { cache: "no-store" }),
        fetch("/api/characters", { cache: "no-store" }),
        fetch("/api/billing", { cache: "no-store" }),
      ]);
      const voiceData = await voiceRes.json();
      const charData = await charRes.json();
      const billData = await billRes.json();
      if (cancelled) return;
      if (Array.isArray(voiceData.voices)) setVoices(voiceData.voices);
      if (Array.isArray(voiceData.house)) setHouseVoices(voiceData.house);
      const cloneIds = Array.isArray(voiceData.voices)
        ? voiceData.voices.map((v: { id?: unknown }) => String(v.id || "")).filter(Boolean)
        : [];
      setSelectedVoiceId(pickStudioVoiceId(cloneIds, voiceData.lastVoiceId));
      if (Array.isArray(charData.characters)) setCharacters(charData.characters);
      if (Array.isArray(charData.lastCharacterIds) && charData.lastCharacterIds.length) {
        setSelectedCharacterIds(charData.lastCharacterIds.map(String));
      }
      if (billRes.ok && billData) applyBill(billData);
    })();
    const onBill = () => void loadBill();
    window.addEventListener("focus", onBill);
    window.addEventListener("duaer-billing", onBill);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onBill);
      window.removeEventListener("duaer-billing", onBill);
    };
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
      houseAudioRef.current?.pause();
    };
  }, []);

  function stopHousePreview() {
    houseAudioRef.current?.pause();
    houseAudioRef.current = null;
    setPlayingHouseId("");
  }

  async function toggleHousePreview(voice: { id: string; sampleUrl?: string }) {
    if (playingHouseId === voice.id) {
      stopHousePreview();
      return;
    }
    const src = voice.sampleUrl;
    if (!src) return;
    stopHousePreview();
    setHouseHearHint("");
    const audio = new Audio(src);
    houseAudioRef.current = audio;
    setPlayingHouseId(voice.id);
    audio.onended = () => {
      if (houseAudioRef.current === audio) stopHousePreview();
    };
    try {
      await audio.play();
    } catch {
      stopHousePreview();
      setHouseHearHint("这条暂时听不了");
    }
  }

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
    if (needDailyFor4K) {
      setError("4K 要日更套餐");
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const form = new FormData();
      form.set("idea", idea);
      form.set("look", look);
      form.set("aspect", aspect);
      form.set("quality", quality);
      form.set("durationSec", String(durationSec));
      form.set("topic", talkKind);
      for (const f of files) form.append("photos", f);
      for (const id of selectedCharacterIds) form.append("characterIds", id);
      if (selectedVoiceId) form.set("voiceId", selectedVoiceId);
      const res = await fetch("/api/projects", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        if (data.billing) {
          setBilling({
            planName: String(data.billing.planName || "试做"),
            remaining: Number(data.billing.remaining) || 0,
            allows4K: Boolean(data.billing.allows4K),
          });
        }
        throw new Error(data.error || "提交失败");
      }
      const id = data.project?.id;
      if (!id) throw new Error("提交失败");
      router.push(`/talks/${id}`);
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
  const selectedHouse = houseVoices.find((v) => v.id === selectedVoiceId);
  const charExpanding = characterDetail?.status === "expanding";
  const charRerunning = characterDetail?.status === "rerunning";
  const turnBusy = cutting || expanding || reviewing || enhancing || rerunning;
  const showTurn = Boolean(turn) && (turnBusy || !characterDetail);
  const showCharacter = Boolean(characterDetail) && !showTurn;
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
      <div className={turn || characterDetail ? styles.live : styles.layout}>
        <div className={styles.rail}>
          <section className={styles.hero}>
            <h1 className={styles.heroTitle}>
              把要讲的话
              <br />
              做成视频
            </h1>
            <p className={styles.lede}>
              先写要讲的话。确认了，再出画面。
            </p>
            <p className={styles.priceHint}>
              {billing
                ? `${billing.planName} · 本月还剩 ${billing.remaining} 条 · 先写文案扣一条`
                : "试做免费 2 条 · 开讲 128 元/月 20 条 · 日更 268 元/月"}
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
          {characters.length > 0 && (
            <div className={styles.tightBox}>
              <p className={styles.voiceLabel}>
                人物
                {selectedCharacterIds[0] ? (
                  <button type="button" className={styles.hear} onClick={() => setInspectCharacterId(selectedCharacterIds[0]!)}>
                    看形象
                  </button>
                ) : null}
              </p>
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
            </div>
          )}
          <div className={styles.tightBox}>
            <p className={styles.voiceLabel}>
              口播声音
              <small>点选，再点听</small>
            </p>
            {voices.length > 0 && (
              <div className={styles.voiceChips} role="group" aria-label="克隆音色">
                {voices.map((v) => (
                  <span key={v.id} className={styles.voiceChip}>
                    <button
                      type="button"
                      className={selectedVoiceId === v.id ? `${styles.ratio} ${styles.on}` : styles.ratio}
                      onClick={() => setSelectedVoiceId(v.id)}
                    >
                      {v.name}
                    </button>
                    <button
                      type="button"
                      className={playingHouseId === v.id ? `${styles.hear} ${styles.on}` : styles.hear}
                      aria-label={`试听${v.name}`}
                      onClick={() => void toggleHousePreview(v)}
                    >
                      {playingHouseId === v.id ? "停" : "听"}
                    </button>
                  </span>
                ))}
              </div>
            )}
            {houseVoices.length > 0 && (
              <div className={styles.voiceChips} role="group" aria-label="自带音色">
                {houseVoices.map((v) => (
                  <span key={v.id} className={styles.voiceChip}>
                    <button
                      type="button"
                      className={selectedVoiceId === v.id ? `${styles.ratio} ${styles.on}` : styles.ratio}
                      onClick={() => setSelectedVoiceId(v.id)}
                    >
                      {v.name}
                    </button>
                    <button
                      type="button"
                      className={playingHouseId === v.id ? `${styles.hear} ${styles.on}` : styles.hear}
                      aria-label={`试听${v.name}`}
                      onClick={() => void toggleHousePreview(v)}
                    >
                      {playingHouseId === v.id ? "停" : "听"}
                    </button>
                  </span>
                ))}
              </div>
            )}
            {selectedHouse && <p className={styles.hint}>{selectedHouse.blurb}</p>}
            {houseHearHint && <p className={styles.err}>{houseHearHint}</p>}
            <details
              className={styles.fold}
              open={cloneOpen || recState !== "idle"}
              onToggle={(e) => setCloneOpen((e.target as HTMLDetailsElement).open)}
            >
              <summary>录自己的声音</summary>
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
                      : "对着麦克风说 10 秒以上"}
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
              {voiceSavedHint && <p className={styles.hint}>{voiceSavedHint}</p>}
            </details>
          </div>

          <div className={styles.compact}>
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
            <div className={styles.aspects} role="group" aria-label="清晰度">
              {QUALITIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  aria-pressed={quality === q}
                  className={quality === q ? `${styles.ratio} ${styles.on}` : styles.ratio}
                  onClick={() => {
                    setError("");
                    setQuality(q);
                  }}
                >
                  {q === "4K" && billing && !billing.allows4K ? "4K · 日更" : q}
                </button>
              ))}
            </div>
            {needDailyFor4K ? (
              <p className={styles.hint}>
                4K 要日更套餐。<Link href="/plans">去开通</Link>
              </p>
            ) : null}
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
            <div className={styles.aspects} role="group" aria-label="这条口播做什么">
              {(
                [
                  ["knowledge", "知识"],
                  ["story", "情感"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={talkKind === id ? `${styles.ratio} ${styles.on}` : styles.ratio}
                  onClick={() => {
                    setTalkKind(id);
                    setIdea((prev) =>
                      prev.trim()
                        ? prev
                        : id === "knowledge"
                          ? "为什么一到晚上就想乱花钱"
                          : "人到中年，谁还在等别人点头",
                    );
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className={`${styles.idea} ${styles.ideaTalk}`}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder={
              talkKind === "knowledge"
                ? "知识：先写要讲明白的一件事。确认文案后再写故事分镜。"
                : "情感：先写要讲透的一种心情。确认文案后再写故事分镜。"
            }
            rows={9}
            required
            minLength={4}
          />
          <details className={styles.fold}>
            <summary>气质补充</summary>
            <textarea
              className={styles.idea}
              value={look}
              onChange={(e) => setLook(e.target.value)}
              placeholder="可空，默认电影大片。赛博雨夜、西部荒漠、宫廷烛光…"
              rows={2}
            />
          </details>

          <button className={styles.go} type="submit" disabled={producing || (billing != null && billing.remaining <= 0)}>
            {producing
              ? "正在打开这条口播…"
              : billing && billing.remaining <= 0
                ? "本月条数用完了"
                : "先写文案"}
          </button>
          <Link className={styles.goGhost} href="/talks">
            我的视频
          </Link>
          {billing && billing.remaining <= 0 && (
            <p className={styles.hint}>
              <Link href="/plans">去开通或加买加条</Link>
            </p>
          )}
          {error && (
            <p className={styles.err}>
              {error}
              {/日更|开通|加买/.test(error) ? <Link href="/plans">去开通</Link> : null}
            </p>
          )}
        </form>
        </div>

        <section className={styles.stage} aria-live="polite">
          <div className={styles.panel}>
            {!showTurn && !showCharacter && <HomeWall />}
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
                <button className={styles.ghost} type="button" onClick={() => setInspectCharacterId("")}>
                  回去看片
                </button>
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
          </div>
        </section>
      </div>
    </div>
  );
}
