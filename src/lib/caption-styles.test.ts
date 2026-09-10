import { describe, expect, it } from "vitest";
import { houseCatalog } from "./duaer-registry";
import {
  CAPTION_STYLES,
  CARD_CAPTION_STYLES,
  FX_CAPTION_STYLES,
  FRAME_CAPTION_STYLES,
  HOUSE_CAPTION_STYLES,
  LOOK_CAPTION_STYLES,
  MOVE_CAPTION_STYLES,
  POP_CAPTION_STYLES,
  PREVIEW_SLAM_STACK,
  captionPreviewTokens,
  captionSkinClass,
  captionStyleLabel,
  parseCaptionStyle,
  resolveCaptionStyle,
} from "./caption-styles";

describe("caption styles", () => {
  it("lists every house caption component with a Chinese name", () => {
    const house = houseCatalog()
      .map((item) => item.wraps)
      .filter((name) => name.startsWith("caption-"))
      .sort();
    expect(HOUSE_CAPTION_STYLES).toHaveLength(17);
    expect(HOUSE_CAPTION_STYLES.map((row) => row.id).slice().sort()).toEqual(house);
    expect(HOUSE_CAPTION_STYLES.every((row) => /[\u4e00-\u9fff]/.test(row.label))).toBe(true);
  });

  it("lists cinematic, effect, frame, move, card, and pop skins", () => {
    expect(LOOK_CAPTION_STYLES).toHaveLength(35);
    expect(FX_CAPTION_STYLES).toHaveLength(24);
    expect(FRAME_CAPTION_STYLES).toHaveLength(13);
    expect(MOVE_CAPTION_STYLES).toHaveLength(24);
    expect(CARD_CAPTION_STYLES).toHaveLength(10);
    expect(POP_CAPTION_STYLES).toHaveLength(16);
    expect(CAPTION_STYLES).toHaveLength(139);
    expect(POP_CAPTION_STYLES.map((row) => row.label)).toEqual([
      "打乱露出",
      "错落淡上",
      "遮罩字",
      "数字弹",
      "线对切",
      "虚化入",
      "翻页滑入",
      "对上切",
      "翻板字",
      "字光标",
      "杂志闪",
      "手写下划",
      "闪白字",
      "状态对切",
      "打字点",
      "网点字",
    ]);
    expect(POP_CAPTION_STYLES.every((row) => row.id.startsWith("pop-"))).toBe(true);
  });

  it("parses known styles and falls unknown back to auto", () => {
    expect(parseCaptionStyle("pop-scramble")).toBe("pop-scramble");
    expect(parseCaptionStyle("pop-halftone")).toBe("pop-halftone");
    expect(parseCaptionStyle("nope")).toBeUndefined();
    expect(captionStyleLabel("pop-cursor")).toBe("字光标");
    expect(captionStyleLabel("pop-underline")).toBe("手写下划");
    expect(captionSkinClass("pop-flap")).toBe("cap-pop-flap");
  });

  it("lets a shot style override the all-talk style", () => {
    expect(resolveCaptionStyle("pop-count", "card-minimal")?.preview).toBe("popCount");
    expect(resolveCaptionStyle("", "pop-white")?.preview).toBe("popWhite");
    expect(resolveCaptionStyle("", "")).toBeUndefined();
  });

  it("splits preview tokens for slam stack vs per-character motion", () => {
    expect(PREVIEW_SLAM_STACK.has("slam")).toBe(true);
    expect(captionPreviewTokens("人到中年放过自己", "stack")).toEqual(["人到", "中年", "放过", "自己"]);
    expect(captionPreviewTokens("人到中年", "chars")).toEqual(["人", "到", "中", "年"]);
  });
});
