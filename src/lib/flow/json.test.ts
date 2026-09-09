import { describe, expect, it } from "vitest";
import { extractStreamDelta } from "./json";

describe("chat stream delta", () => {
  it("reads OpenAI-style SSE content", () => {
    expect(extractStreamDelta('data: {"choices":[{"delta":{"content":"钩子"}}]}')).toBe("钩子");
    expect(extractStreamDelta("data: [DONE]")).toBe("");
  });
});
