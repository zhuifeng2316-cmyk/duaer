import { describe, expect, it } from "vitest";
import { findHousePreview } from "./house-preview";
import { HOUSE_PREVIEW_LINE, publicHouseVoices } from "./house-voices";

describe("house preview", () => {
  it("points every house voice at a listen URL and has a Chinese line", () => {
    expect(HOUSE_PREVIEW_LINE).toMatch(/大片来袭/);
    expect(HOUSE_PREVIEW_LINE).not.toMatch(/uranus|bigtts|seed|cosy/i);
    for (const voice of publicHouseVoices()) {
      expect(voice.sampleUrl).toContain(voice.id);
    }
  });

  it("has no cached preview for a missing house folder", async () => {
    expect(await findHousePreview("house-no-such")).toBeNull();
  });
});
