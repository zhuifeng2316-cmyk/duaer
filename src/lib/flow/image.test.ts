import { describe, expect, it } from "vitest";
import { buildImageGenContent, cloneImagePrompt, flowImageEndpoint } from "./image";

describe("image gen payload", () => {
  it("posts clone stills to the ark images endpoint", () => {
    expect(flowImageEndpoint()).toMatch(/\/api\/v3\/images\/generations$/);
    expect(flowImageEndpoint()).toMatch(/ark\.cn-beijing/);
  });

  it("puts reference photos first so identity is not ignored", () => {
    const parts = buildImageGenContent({
      prompt: "改朝向",
      imageDataUrls: ["data:image/jpeg;base64,AAA", "data:image/png;base64,BBB"],
    });
    expect(parts[0]).toMatchObject({ type: "image_url" });
    expect(parts[1]).toMatchObject({ type: "image_url" });
    expect(parts[2]).toEqual({ type: "text", text: "改朝向" });
  });

  it("puts identity text after the reference photos", () => {
    const parts = buildImageGenContent({
      lead: "必须是这个人",
      prompt: "变高清",
      imageDataUrls: ["data:image/jpeg;base64,AAA"],
    });
    expect(parts[0]).toMatchObject({ type: "image_url" });
    expect(parts[1]).toEqual({ type: "text", text: "必须是这个人" });
    expect(parts[2]).toEqual({ type: "text", text: "变高清" });
  });

  it("locks clone stills to the photo, not a new actor", () => {
    const p = cloneImagePrompt({ scene: "窗边", aspect: "9:16" });
    expect(p).toMatch(/附图就是这个人/);
    expect(p).toMatch(/是男就是男/);
    expect(p).toMatch(/不要换人/);
    expect(p).toMatch(/衣服颜色和款式尽量原样/);
    expect(p).toMatch(/电影大片静帧/);
    expect(p).not.toMatch(/白人银发绿眼/);
  });

  it("asks for every selected person when there are multiple heads", () => {
    const p = cloneImagePrompt({ scene: "咖啡馆", aspect: "9:16", peopleCount: 2 });
    expect(p).toMatch(/2 个不同的人/);
    expect(p).toMatch(/同时出现/);
    expect(p).toMatch(/禁止漏人/);
  });
});
