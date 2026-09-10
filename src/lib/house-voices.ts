export const HOUSE_VOICE_PREFIX = "house-";

export type HouseVoice = {
  id: string;
  name: string;
  blurb: string;
  /** 系统预置 speaker，只在服务端用，C 端不展示 */
  speaker: string;
  vibe: string;
};

export const HOUSE_VOICES: HouseVoice[] = [
  {
    id: "house-lengxu",
    name: "冷叙",
    blurb: "压着说，不求你听",
    speaker: "zh_female_gaolengyujie_uranus_bigtts",
    vibe: "压着嗓子冷着说，不求人听。",
  },
  {
    id: "house-yizhi",
    name: "译制",
    blurb: "像老电影画外音",
    speaker: "zh_male_yizhipiannan_uranus_bigtts",
    vibe: "像译制片画外音，字正腔圆，留白。",
  },
  {
    id: "house-xuan",
    name: "悬疑",
    blurb: "压低，往前探",
    speaker: "zh_male_xuanyijieshuo_uranus_bigtts",
    vibe: "压低嗓子往前探，带着怀疑。",
  },
  {
    id: "house-ye",
    name: "夜谈",
    blurb: "夜里把话说透",
    speaker: "zh_male_shenyeboke_uranus_bigtts",
    vibe: "夜里把话说透，气口长，贴着耳。",
  },
  {
    id: "house-ba",
    name: "青叔",
    blurb: "沉、狠，一句钉死",
    speaker: "zh_male_baqiqingshu_uranus_bigtts",
    vibe: "沉、狠，一句钉死，不要飘。",
  },
  {
    id: "house-zhi",
    name: "直率",
    blurb: "一句捅破，带着火",
    speaker: "zh_female_zhishuaiyingzi_uranus_bigtts",
    vibe: "一句捅破，不绕，带着火。",
  },
];

export const DEFAULT_HOUSE_VOICE_ID = HOUSE_VOICES[0]!.id;

/** 有克隆就默认用克隆；没有克隆才用自带冷叙。上次点选的克隆优先于最新一条。 */
export function pickStudioVoiceId(cloneIds: string[], lastVoiceId?: string | null): string {
  const clones = cloneIds.map((id) => String(id || "").trim()).filter(Boolean);
  const last = String(lastVoiceId || "").trim();
  if (last && clones.includes(last)) return last;
  if (clones[0]) return clones[0];
  if (last && getHouseVoice(last)) return last;
  return DEFAULT_HOUSE_VOICE_ID;
}

export function isHouseVoiceId(id: string | null | undefined): boolean {
  const v = String(id || "").trim();
  return v.startsWith(HOUSE_VOICE_PREFIX);
}

export function getHouseVoice(id: string | null | undefined): HouseVoice | null {
  const v = String(id || "").trim();
  return HOUSE_VOICES.find((row) => row.id === v) || null;
}

export const HOUSE_PREVIEW_LINE = "大片来袭，小白也能做专业片。";

export function housePreviewUrl(id: string): string {
  return `/api/voices/${id}/media?f=sample.wav`;
}

export function publicHouseVoices() {
  return HOUSE_VOICES.map(({ id, name, blurb }) => ({
    id,
    name,
    blurb,
    sampleUrl: housePreviewUrl(id),
  }));
}
