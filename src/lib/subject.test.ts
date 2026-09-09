import { describe, expect, it } from "vitest";
import { SUBJECT_DESCRIBE_PROMPT, cleanSubjectDescription } from "./subject";

describe("subject identity lock", () => {
  it("forces visible gender and forbids defaulting to female", () => {
    expect(SUBJECT_DESCRIBE_PROMPT).toMatch(/男性/);
    expect(SUBJECT_DESCRIBE_PROMPT).toMatch(/禁止默认写成女性/);
    expect(SUBJECT_DESCRIBE_PROMPT).toMatch(/锁身份/);
    expect(SUBJECT_DESCRIBE_PROMPT).toMatch(/不要写衣服/);
    expect(SUBJECT_DESCRIBE_PROMPT).toMatch(/眼距/);
    expect(SUBJECT_DESCRIBE_PROMPT).toMatch(/痣斑疤/);
  });

  it("collapses description whitespace", () => {
    expect(cleanSubjectDescription("  男性\n短发  ")).toBe("男性 短发");
  });
});
