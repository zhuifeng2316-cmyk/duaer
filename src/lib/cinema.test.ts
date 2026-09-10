import { describe, expect, it } from "vitest";
import { CINEMA_GRAPHIC_LOCK, CINEMA_GRAPHIC_TOKENS, CINEMA_IDENTITY_LEAD, CINEMA_STILL_LOCK, cinemaMountVars, cinemaMovieStillPrompt, cinemaPosterCopy, cinemaPosterTitle, needsCinemaHostGrade, stripBoardLettering } from "./cinema";
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
    expect(p).toMatch(/场景气质：电影大片/);
    expect(p).toMatch(/画面上不要字/);
    expect(p).toMatch(/电影大片海报/);
  });

  it("keeps extra look as a layer on top of cinema", () => {
    const p = cloneImagePrompt({ scene: "窗边", aspect: "9:16", look: "赛博雨夜" });
    expect(p).toMatch(/电影大片/);
    expect(p).toMatch(/赛博雨夜/);
  });

  it("paints a short poster title on talk stills, not the full caption", () => {
    expect(cinemaPosterTitle("看见自己，不等于懂他")).toBe("看见自己");
    expect(cinemaPosterTitle("人不出镜也行")).toBe("人不出镜也行");
    const p = cloneImagePrompt({
      scene: "窗边",
      aspect: "9:16",
      onScreenText: "看见自己，不等于懂他",
      imagePrompt: "窗边侧光。上半部留出大标题位，画上屏幕字：看见自己，不等于懂他。",
    });
    expect(p).toMatch(/看见自己/);
    expect(p).not.toMatch(/不等于懂他/);
    expect(p).toMatch(/短标题/);
    expect(p).toMatch(/不要把口播整句画上去/);
    expect(p).not.toMatch(/画面上不要字/);
    expect(p).not.toMatch(/画上屏幕字/);
    expect(stripBoardLettering("窗边侧光，画上屏幕字：看见自己，不等于懂他。")).toBe("窗边侧光");
    expect(cinemaPosterCopy("少一点代入，多一点倾听")).toMatch(/少一点代入/);
    expect(cinemaPosterCopy("少一点代入，多一点倾听")).not.toMatch(/多一点倾听/);
    expect(cinemaMovieStillPrompt({ scene: "雨夜街头" })).toMatch(/画面上不要字/);
  });

  it("asks the board writer for movie frames", () => {
    expect(buildBoardSystem(5)).toMatch(/电影大片海报/);
    expect(buildBoardSystem(5)).toMatch(/不要写成手机自拍/);
    expect(buildBoardSystem(5)).toMatch(/不要写路人/);
    expect(buildBoardSystem(5)).toMatch(/只出组件/);
    expect(CINEMA_GRAPHIC_LOCK).toMatch(/电影大片/);
    expect(CINEMA_GRAPHIC_TOKENS.brand).toBe("#e8c56a");
    expect(CINEMA_GRAPHIC_TOKENS.accent).toBe("#d4a05a");
    expect(cinemaMountVars()).toContain("--accent:#d4a05a");
    expect(cinemaMountVars()).toContain("--background:#0c0a08");
    expect(needsCinemaHostGrade("flowchart-vertical")).toBe(true);
    expect(needsCinemaHostGrade("data-chart")).toBe(true);
    expect(needsCinemaHostGrade("caption-kinetic-slam")).toBe(false);
    expect(needsCinemaHostGrade("app-showcase")).toBe(true);
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
