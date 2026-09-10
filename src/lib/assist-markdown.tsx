import type { ReactNode } from "react";

function inlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={`b${key++}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      parts.push(<em key={`i${key++}`}>{token.slice(1, -1)}</em>);
    } else {
      parts.push(<code key={`c${key++}`}>{token.slice(1, -1)}</code>);
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** 轻量渲染助手回复：标题 / 列表 / 粗斜体，不引入厂商组件。 */
export function AssistMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  function flushList() {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={`l${key++}`}>
        {list.items.map((item, i) => (
          <li key={i}>{inlineMarkdown(item)}</li>
        ))}
      </Tag>,
    );
    list = null;
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    const ul = /^[-*•]\s+(.+)$/.exec(line.trim());
    const ol = /^(\d+)[.)]\s+(.+)$/.exec(line.trim());
    if (heading) {
      flushList();
      const level = heading[1]!.length;
      const body = inlineMarkdown(heading[2]!);
      if (level === 1) blocks.push(<h3 key={`h${key++}`}>{body}</h3>);
      else if (level === 2) blocks.push(<h4 key={`h${key++}`}>{body}</h4>);
      else blocks.push(<h5 key={`h${key++}`}>{body}</h5>);
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
    if (!line.trim()) continue;
    // 单独一行 **标题** 当小标题
    const loneBold = /^\*\*([^*]+)\*\*$/.exec(line.trim());
    if (loneBold) {
      blocks.push(<p key={`p${key++}`} className="assistMdLead">{inlineMarkdown(line.trim())}</p>);
      continue;
    }
    blocks.push(<p key={`p${key++}`}>{inlineMarkdown(line)}</p>);
  }
  flushList();
  return <>{blocks}</>;
}
