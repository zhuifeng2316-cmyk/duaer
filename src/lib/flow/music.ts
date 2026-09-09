import {
  authHeaders,
  getFlowApiKey,
  getFlowBaseUrl,
  getMusicModel,
  mapFlowHttpError,
  readFlowJson,
} from "./config";

type FlowMusicTask = {
  taskId?: string;
  status?: string;
  tracks?: { audioUrl?: string }[];
  error?: string;
  message?: string;
};

async function createMusicTask(prompt: string, durationSec: number): Promise<string> {
  const apiKey = getFlowApiKey();
  if (!apiKey) throw new Error("未配置密钥");
  const res = await fetch(`${getFlowBaseUrl()}/api/v1/music/generations`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      model: getMusicModel(),
      prompt,
      title: "Duaer BGM",
      wait: false,
      style: "cinematic short-form instrumental",
      instrumental: true,
      durationSec,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await readFlowJson<FlowMusicTask>(res);
  if (!res.ok) throw new Error(mapFlowHttpError(res.status, data, "配乐"));
  if (!data.taskId) throw new Error("配乐未返回任务");
  return data.taskId;
}

async function pollMusic(taskId: string): Promise<string> {
  const apiKey = getFlowApiKey();
  const started = Date.now();
  while (Date.now() - started < 280_000) {
    const url = new URL(`${getFlowBaseUrl()}/api/v1/music/generations`);
    url.searchParams.set("taskId", taskId);
    const res = await fetch(url, {
      headers: authHeaders(apiKey),
      signal: AbortSignal.timeout(20_000),
    });
    const last = await readFlowJson<FlowMusicTask>(res);
    if (!res.ok) throw new Error(mapFlowHttpError(res.status, last, "配乐"));
    const status = (last.status || "").toLowerCase();
    if (["ready", "completed", "success"].includes(status)) {
      const audioUrl = last.tracks?.find((t) => t.audioUrl)?.audioUrl;
      if (!audioUrl) throw new Error("配乐完成但没有音频");
      return audioUrl;
    }
    if (["failed", "error", "cancelled", "canceled"].includes(status)) {
      throw new Error(last.message || last.error || "配乐失败");
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error("等待配乐超时");
}

export async function generateInstrumentalBgm(prompt: string, durationSec: number): Promise<string> {
  const taskId = await createMusicTask(prompt, durationSec);
  return pollMusic(taskId);
}
