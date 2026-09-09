import { describe, expect, it } from "vitest";
import { ANGLE_VIEWS, turnaroundLead, turnaroundPrompt } from "./angles";
import { CINEMA_IDENTITY_LEAD, cinemaMovieStillPrompt } from "./cinema";
import { HEAD_UPSCALE_FILTER } from "./head-crop";
import { cloneImagePrompt } from "./flow/image";

describe("current head → HD → cinema flow", () => {
  it("step 1: HD is a pixel retouch, not a model redraw", () => {
    expect(HEAD_UPSCALE_FILTER).toMatch(/lanczos/);
    expect(HEAD_UPSCALE_FILTER).toMatch(/cas=/);
    expect(HEAD_UPSCALE_FILTER).not.toMatch(/unsharp/);
    expect(HEAD_UPSCALE_FILTER).not.toMatch(/生成|换脸|重绘/);
  });

  it("step 2: confirm prompt is a movie still of the extracted face", () => {
    const p = turnaroundPrompt(ANGLE_VIEWS[0], "男性，短发");
    expect(p).toMatch(/电影大片静帧/);
    expect(p).toMatch(/不要变年轻/);
    expect(p).toMatch(/男性，短发/);
    expect(turnaroundLead()).toBe(CINEMA_IDENTITY_LEAD);
    expect(cinemaMovieStillPrompt({ scene: "雨夜街头" })).toMatch(/先锁脸/);
  });

  it("step 3: clone stills keep cinema plus identity", () => {
    const p = cloneImagePrompt({ scene: "窗边", aspect: "9:16" });
    expect(p).toMatch(/电影大片静帧/);
    expect(p).toMatch(/不要换人/);
    expect(p).toMatch(/同一个人/);
  });

  it("has eight cinema camera angles after confirm", () => {
    expect(ANGLE_VIEWS).toHaveLength(8);
    expect(ANGLE_VIEWS.every((v) => turnaroundPrompt(v).includes(String(v.yaw)))).toBe(true);
  });
});
