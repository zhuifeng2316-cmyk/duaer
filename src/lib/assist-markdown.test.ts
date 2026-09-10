import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AssistMarkdown } from "./assist-markdown";

describe("AssistMarkdown", () => {
  it("renders bold and lists", () => {
    const html = renderToStaticMarkup(
      AssistMarkdown({
        text: "**粗体标题**\n\n- 第一项\n- 第二项\n\n正文里有 **强调**。",
      }),
    );
    expect(html).toContain("<h4>粗体标题</h4>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>第一项</li>");
    expect(html).toContain("<strong>强调</strong>");
    expect(html).not.toContain("**强调**");
    expect(html).not.toContain("**粗体标题**");
  });

  it("renders numbered lists with Chinese separators", () => {
    const html = renderToStaticMarkup(
      AssistMarkdown({
        text: "1、第一\n2. 第二\n3) 第三",
      }),
    );
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>第一</li>");
    expect(html).toContain("<li>第二</li>");
    expect(html).toContain("<li>第三</li>");
  });
});
