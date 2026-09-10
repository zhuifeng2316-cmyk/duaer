import { describe, expect, it } from "vitest";
import { isProduceDockPhase, produceStepIndex } from "./talk-progress";

describe("talk produce dock", () => {
  it("keeps copy and board progress off the after-confirm dock", () => {
    expect(isProduceDockPhase("copy")).toBe(false);
    expect(isProduceDockPhase("board")).toBe(false);
    expect(isProduceDockPhase("speech")).toBe(true);
    expect(isProduceDockPhase("assemble")).toBe(true);
  });

  it("orders stills-to-film steps for the bottom dock", () => {
    expect(produceStepIndex("images")).toBe(0);
    expect(produceStepIndex("speech")).toBe(1);
    expect(produceStepIndex("cover")).toBe(5);
  });
});
