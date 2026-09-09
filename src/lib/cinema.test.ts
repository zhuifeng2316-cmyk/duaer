import { describe, expect, it } from "vitest";
import { CINEMA_IDENTITY_LEAD, CINEMA_STILL_LOCK, cinemaMovieStillPrompt } from "./cinema";
import { cloneImagePrompt } from "./flow/image";
import { ANGLE_VIEWS, turnaroundPrompt } from "./angles";
import { buildBoardSystem } from "./copy";

describe("cinema lock", () => {
  it("forces a movie still even when look is empty", () => {
    const p = cloneImagePrompt({ scene: "窗边", aspect: "9:16" });
    expect(p).toMatch(/电影大片静帧/);
    expect(p).toMatch(/不是手机自拍/);
    expect(p).toMatch(/不是证件照/);
    expect(p).toContain(CINEMA_STILL_LOCK);
  });

  it("keeps extra look as a layer on top of cinema", () => {
    const p = cloneImagePrompt({ scene: "窗边", aspect: "9:16", look: "赛博雨夜" });
    expect(p).toMatch(/电影大片/);
    expect(p).toMatch(/赛博雨夜/);
  });

  it("asks the board writer for movie frames", () => {
    expect(buildBoardSystem(5)).toMatch(/电影大片/);
    expect(buildBoardSystem(5)).toMatch(/不要写成手机自拍/);
    expect(buildBoardSystem(5)).toMatch(/不要写路人/);
  });

  it("puts the extracted face into a movie frame without a new actor", () => {
    const p = cinemaMovieStillPrompt({ scene: "雨夜街头", identity: "男性，短发" });
    expect(p).toMatch(/电影大片静帧/);
    expect(p).toMatch(/不要变年轻/);
    expect(p).toMatch(/衣服颜色和款式尽量原样/);
    expect(p).toMatch(/男性，短发/);
    expect(p).toMatch(/雨夜街头/);
    expect(p).not.toMatch(/服装按电影角色来/);
    expect(CINEMA_IDENTITY_LEAD).toMatch(/不要换人/);
    expect(turnaroundPrompt(ANGLE_VIEWS[0])).toMatch(/电影大片静帧/);
  });
});
