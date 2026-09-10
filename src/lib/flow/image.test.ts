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
    expect(p).toMatch(/只能出现附图这一个人/);
    expect(p).toMatch(/不要路人/);
    expect(p).not.toMatch(/白人银发绿眼/);
  });

  it("asks talk stills to paint a short poster title", () => {
    const p = cloneImagePrompt({ scene: "窗边", aspect: "9:16", onScreenText: "还在自己拍口播？" });
    expect(p).toMatch(/还在自己拍口播/);
    expect(p).toMatch(/短标题/);
    expect(p).not.toMatch(/画面上不要字/);
  });

  it("does not treat extra reference photos as extra people", () => {
    const p = cloneImagePrompt({ scene: "咖啡馆", aspect: "9:16", peopleCount: 1 });
    expect(p).toMatch(/只能出现附图这一个人/);
    expect(p).not.toMatch(/2 个不同的人/);
  });

  it("allows extra people only when the board text asks", () => {
    const p = cloneImagePrompt({
      scene: "咖啡馆",
      aspect: "9:16",
      imagePrompt: "窗边特写，同事坐在对面闭口",
    });
    expect(p).toMatch(/分镜要求的其他人可以按描述出现/);
    expect(p).not.toMatch(/只能出现附图这一个人/);
  });

  it("asks for every selected person when there are multiple heads", () => {
    const p = cloneImagePrompt({ scene: "咖啡馆", aspect: "9:16", peopleCount: 2 });
    expect(p).toMatch(/2 个不同的人/);
    expect(p).toMatch(/同时出现/);
    expect(p).toMatch(/禁止漏人/);
    expect(p).toMatch(/不要再加没选中的路人/);
    expect(p).not.toMatch(/只能出现附图这一个人/);
  });
});
