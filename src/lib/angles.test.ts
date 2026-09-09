import { describe, expect, it } from "vitest";
import { ANGLE_VIEWS, angleStillRel, turnaroundLead, turnaroundPrompt } from "./angles";

describe("eight-angle turnaround", () => {
  it("has eight unique directions around the person", () => {
    expect(ANGLE_VIEWS).toHaveLength(8);
    expect(new Set(ANGLE_VIEWS.map((v) => v.id)).size).toBe(8);
    expect(new Set(ANGLE_VIEWS.map((v) => v.yaw)).size).toBe(8);
    expect(ANGLE_VIEWS.map((v) => v.label)).toEqual([
      "正面",
      "右前",
      "右侧",
      "右后",
      "背面",
      "左后",
      "左侧",
      "左前",
    ]);
    expect(ANGLE_VIEWS[0]?.pose).toMatch(/电影/);
    expect(angleStillRel(0, "front", 2)).toBe("views/01-front-v2.png");
  });

  it("asks for a movie still of the same face", () => {
    const p = turnaroundPrompt(ANGLE_VIEWS[4], "男性，约30岁，短发，方脸");
    expect(p).toMatch(/电影大片静帧/);
    expect(p).toMatch(/不要变年轻/);
    expect(p).toMatch(/衣服颜色和款式尽量原样/);
    expect(p).toMatch(/男性，约30岁，短发，方脸/);
    expect(p).toMatch(/背面/);
    expect(p).toMatch(/180/);
    expect(turnaroundLead()).toMatch(/同一个人/);
  });
});
