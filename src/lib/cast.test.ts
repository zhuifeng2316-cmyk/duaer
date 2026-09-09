import { describe, expect, it } from "vitest";
import { projectPeopleCount, shotAsksForOthers } from "./cast";

describe("cast lock", () => {
  it("counts people by selected characters, not reference photos", () => {
    expect(projectPeopleCount()).toBe(1);
    expect(projectPeopleCount([])).toBe(1);
    expect(projectPeopleCount(["a"])).toBe(1);
    expect(projectPeopleCount(["a", "b"])).toBe(2);
  });

  it("only treats a shot as asking for others when the board names them", () => {
    expect(shotAsksForOthers("窗边侧光特写，闭口")).toBe(false);
    expect(shotAsksForOthers("不要路人，只有这一个人")).toBe(false);
    expect(shotAsksForOthers("窗边特写，同事坐在对面闭口")).toBe(true);
    expect(shotAsksForOthers("两个人同框，闭口")).toBe(true);
  });
});
