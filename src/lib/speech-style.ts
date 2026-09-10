import { getHouseVoice } from "./house-voices";

export type SpeechStyle = {
  instruction: string;
  speechRate: number;
  ffmpegTempo: number;
};

function clampRate(n: number): number {
  return Math.max(-50, Math.min(100, Math.round(n)));
}

export function talkSpeechStyle(opts: {
  index: number;
  total: number;
  line?: string;
  topic?: string | null;
  voiceId?: string | null;
  voiceRole?: string | null;
}): SpeechStyle {
  const total = Math.max(1, opts.total);
  const index = Math.max(0, Math.min(opts.index, total - 1));
  const last = total > 1 && index === total - 1;
  const first = index === 0;
  const longLine = (opts.line || "").replace(/\s+/g, "").length > 22;
  const house = getHouseVoice(opts.voiceId);
  const knowledge = opts.topic === "knowledge";
  const story = opts.topic === "story";
  const role = opts.voiceRole;

  let pace = "语速跟上，语气活一点，别念稿。";
  let speechRate = 8;
  if (role === "hook" || (!role && first)) {
    pace = "开口稍快更有力，起伏大，重点字咬死。";
    speechRate = 20;
  } else if (role === "hold" || (!role && last)) {
    pace = "跟上语速，最后四字放慢收住，留气口。";
    speechRate = -18;
  } else if (role === "push") {
    pace = "有起伏，往前推，不要平。";
    speechRate = 6;
  } else if (index % 2 === 1) {
    pace = "稍快，带着劲，重点字加重。";
    speechRate = 12;
  } else {
    pace = "有起伏，往前推，不要平。";
    speechRate = 6;
  }
  if (longLine) speechRate -= 8;

  const topicLine = knowledge
    ? "像把一件事钉死，别煽情。"
    : story
      ? "像夜里把话说给人听，压着哽。"
      : "";

  const parts = [house?.vibe, topicLine, pace].filter(Boolean) as string[];
  let instruction = parts.join("");
  if (house) instruction = instruction.slice(0, 80);
  else instruction = (topicLine + pace).trim().slice(0, 50);

  return {
    instruction,
    speechRate: clampRate(speechRate),
    ffmpegTempo: house ? 1 : first ? 1.16 : last ? 1.08 : 1.18,
  };
}

/** 克隆通道指令宜短。 */
export function cinemaSpeechInstruction(opts: { index: number; total: number; topic?: string | null }): string {
  return talkSpeechStyle({ index: opts.index, total: opts.total, topic: opts.topic }).instruction.slice(0, 50);
}
