import { CINEMA_IDENTITY_LEAD, cinemaMovieStillPrompt } from "./cinema";

export const ANGLE_VIEWS = [
  { id: "front", label: "正面", yaw: 0, pose: "正面半身，面向镜头，电影构图" },
  { id: "front-right", label: "右前", yaw: 45, pose: "摄像机在人物右前方 45 度，看见正面和右侧" },
  { id: "right", label: "右侧", yaw: 90, pose: "摄像机在人物正右侧" },
  { id: "back-right", label: "右后", yaw: 135, pose: "摄像机在人物右后方 135 度" },
  { id: "back", label: "背面", yaw: 180, pose: "摄像机在人物正后方，看见背影与发型" },
  { id: "back-left", label: "左后", yaw: 225, pose: "摄像机在人物左后方 225 度" },
  { id: "left", label: "左侧", yaw: 270, pose: "摄像机在人物正左侧" },
  { id: "front-left", label: "左前", yaw: 315, pose: "摄像机在人物左前方 315 度，看见正面和左侧" },
] as const;

export function angleStillRel(index: number, viewId: string, version = 1): string {
  return `views/${String(index + 1).padStart(2, "0")}-${viewId}-v${version}.png`;
}

export function characterViewRel(viewId: string, version = 1): string {
  return `views/${viewId}-v${version}.png`;
}

export const CINEMA_TURN_SCENE =
  "同一部电影里的这个人：有环境、有电影光、浅景深、胶片色彩。不是白底证件照，不是棚拍头像。";

export function turnaroundLead(): string {
  return CINEMA_IDENTITY_LEAD;
}

export function turnaroundPrompt(view: AngleView, identity = ""): string {
  return cinemaMovieStillPrompt({
    scene: CINEMA_TURN_SCENE,
    identity,
    angle: `${view.label}（绕人 ${view.yaw} 度）。${view.pose}`,
  });
}
