import { describe, expect, it } from "vitest";
import { buildFlowSpeechBody } from "./speech";

describe("speech request", () => {
  it("sends the saved sample as a reference when cloning", () => {
    const withRef = buildFlowSpeechBody("今晚就能发出去", { mime: "audio/wav", base64: "AAAA" });
    expect(withRef.input).toBe("今晚就能发出去");
    expect(withRef.reference_audio).toMatch(/^data:audio\/wav;base64,AAAA$/);
    expect(withRef.extra_body).toEqual({ references: [{ audio: withRef.reference_audio }] });
    const plain = buildFlowSpeechBody("今晚就能发出去");
    expect(plain.reference_audio).toBeUndefined();
    expect(plain.voice).toBe("zh_female");
  });
});
