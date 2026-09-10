import house from "./duaer-registry.json";

export const VISUAL_MODES = ["story", "product", "knowledge"] as const;
export type VisualMode = (typeof VISUAL_MODES)[number];

export const VISUAL_MODE_LABEL: Record<VisualMode, string> = {
  story: "情感口播",
  product: "产品介绍",
  knowledge: "知识输出",
};

export const GRAPHIC_LABEL: Record<string, string> = {
  "caption-kinetic-slam": "砸字",
  "caption-editorial-emphasis": "杂志字",
  "caption-weight-shift": "字重切换",
  "hw-title": "手写标题",
  "notification-stack": "通知堆",
  "offset-path-traveler": "路径游走",
  "native-notification-pop": "通知弹出",
  "app-showcase": "产品展示",
  "data-chart": "图表",
  "flowchart-vertical": "流程图",
  "caption-highlight": "划重点",
  "hw-pipeline": "手绘流程",
  "pull-to-refresh": "下拉刷新",
  "ui-focus-zoom": "界面放大",
  "oversized-cursor": "大光标",
  "share-sheet-carousel": "分享面板",
  "message-thread-reveal": "聊天对话",
  "ai-chat-reveal": "对话露出",
  "notification-cascade": "通知瀑布",
  "carousel-circle-1": "轮播",
  "code-terminal-run": "代码演示",
  "count-up": "数字跳动",
  "marker-checklist-card": "打勾清单",
  "caption-glitch-rgb": "故障字",
  "caption-neon-glow": "霓虹字",
  typewriter: "打字机",
  "titlecard-calm": "标题卡",
  "light-leak": "漏光",
  "flash-through-white": "闪白",
  "grain-overlay": "胶片颗粒",
};

for (const item of house as Array<{ wraps: string; label: string }>) {
  if (!GRAPHIC_LABEL[item.wraps]) GRAPHIC_LABEL[item.wraps] = item.label;
}

export function graphicLabel(name?: string): string {
  if (!name) return "";
  return GRAPHIC_LABEL[name] || "画面动效";
}

const HOUSE_NAMES = new Set((house as Array<{ wraps: string }>).map((it) => it.wraps));

export function isKnownGraphic(name?: string): boolean {
  return Boolean(name && HOUSE_NAMES.has(name));
}
