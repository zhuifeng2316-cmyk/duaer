"use client";

import type { ReactNode } from "react";

function inlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // 支持 **粗体**、*斜体*、`代码`；粗体优先
  const re = /(\*\*[^*]+?\*\*|\*[^*\n]+?\*|`[^`\n]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(<strong key={`b${key++}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(<em key={`i${key++}`}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      parts.push(<code key={`c${key++}`}>{token.slice(1, -1)}</code>);
    } else {
      parts.push(token);
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

/** 轻量渲染助手回复：标题 / 列表 / 粗斜体，不引入额外依赖。 */
export function AssistMarkdown({ text }: { text: string }) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  function flushList() {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    const items = list.items;
    blocks.push(
      <Tag key={`l${key++}`}>
        {items.map((item, i) => (
          <li key={i}>{inlineMarkdown(item)}</li>
        ))}
      </Tag>,
    );
    list = null;
  }

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    const ul = /^[-*•·・]\s+(.+)$/.exec(trimmed);
    const ol = /^(\d+)(?:[.)]|、|．)\s*(.+)$/.exec(trimmed);
    // 单独一行粗体标题，可带末尾冒号
    const loneBold = /^\*\*([^*]+)\*\*\s*[:：]?$/.exec(trimmed);

    if (heading) {
      flushList();
      const level = heading[1]!.length;
      const body = inlineMarkdown(heading[2]!);
      if (level === 1) blocks.push(<h3 key={`h${key++}`}>{body}</h3>);
      else if (level === 2) blocks.push(<h4 key={`h${key++}`}>{body}</h4>);
      else blocks.push(<h5 key={`h${key++}`}>{body}</h5>);
      continue;
    }
    if (loneBold) {
      flushList();
      blocks.push(<h4 key={`h${key++}`}>{loneBold[1]}</h4>);
      continue;
    }
    if (ul) {
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(ul[1]!);
      continue;
    }
    if (ol) {
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ol[2]!);
      continue;
    }
    flushList();
    blocks.push(<p key={`p${key++}`}>{inlineMarkdown(trimmed)}</p>);
  }
  flushList();
  if (!blocks.length) return <p>{text}</p>;
  return <>{blocks}</>;
}
