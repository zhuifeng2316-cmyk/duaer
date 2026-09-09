import { describe, expect, it } from "vitest";
import { cinemaRefPaths, identityHeadRel } from "./turn-refs";

describe("turn flow refs", () => {
  it("locks cinema stills to the original crop, not the HD or generated file", () => {
    expect(identityHeadRel({ crop: "heads/01.png", file: "heads/01-hd.png" })).toBe("heads/01.png");
    expect(identityHeadRel({ crop: "", file: "heads/01.png" })).toBe("heads/01.png");
  });

  it("sends the head twice plus the source, and never a generated still", () => {
    expect(cinemaRefPaths("/tmp/head.png", "/tmp/source.jpg")).toEqual([
      "/tmp/head.png",
      "/tmp/head.png",
      "/tmp/source.jpg",
    ]);
    expect(cinemaRefPaths("/tmp/head.png")).toEqual(["/tmp/head.png", "/tmp/head.png"]);
    expect(cinemaRefPaths("/tmp/head.png", "/tmp/head.png")).toEqual(["/tmp/head.png", "/tmp/head.png"]);
  });
});
