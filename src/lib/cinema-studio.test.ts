import { describe, expect, it } from "vitest";
import { CINEMA_EDITOR_PORT, parsePreviewUrl, rewriteEditorHost } from "./cinema-studio";

describe("cinema editor urls", () => {
  it("does not bind the site port", () => {
    expect(CINEMA_EDITOR_PORT).not.toBe(3002);
  });
  it("reads a studio url from preview json", () => {
    const raw = `ok\n{"ok":true,"studioUrl":"http://127.0.0.1:4570/studio","url":"http://127.0.0.1:4570"}\n`;
    expect(parsePreviewUrl(raw, 4570)).toBe("http://127.0.0.1:4570/studio");
  });

  it("falls back to the editor port", () => {
    expect(parsePreviewUrl("not json", 4570)).toBe("http://127.0.0.1:4570");
  });

  it("rewrites loopback to the page host on lan", () => {
    expect(rewriteEditorHost("http://127.0.0.1:4570/studio", "192.168.1.8:3002")).toBe(
      "http://192.168.1.8:4570/studio",
    );
    expect(rewriteEditorHost("http://127.0.0.1:4570/studio", "localhost:3002")).toBe(
      "http://127.0.0.1:4570/studio",
    );
  });
});
