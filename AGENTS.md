# Duaer Agent Notes

**产品核心**：人不出镜的 AI 口播。照片克隆画面，声音克隆口播，文案/分镜/配乐都来自 AI。

开发必须遵守：

1. [`.specify/memory/constitution.md`](.specify/memory/constitution.md)
2. [`.cursor/rules/spec-driven-development.mdc`](.cursor/rules/spec-driven-development.mdc)

流程：`specify` → `plan` → `tasks` → `implement`（单测 + 接口测 + 浏览器 E2E）。
当前 feature：[`specs/001-clone-cut-video/`](specs/001-clone-cut-video/)、[`specs/002-reusable-voice/`](specs/002-reusable-voice/)、[`specs/003-eight-angle-character/`](specs/003-eight-angle-character/)、[`specs/004-ark-html-compose/`](specs/004-ark-html-compose/)、[`specs/005-named-character/`](specs/005-named-character/)、[`specs/006-sqlite-library/`](specs/006-sqlite-library/)、[`specs/007-character-views/`](specs/007-character-views/)、[`specs/008-voice-record/`](specs/008-voice-record/)、[`specs/009-confirm-copy/`](specs/009-confirm-copy/)、[`specs/010-board-then-images/`](specs/010-board-then-images/)、[`specs/011-still-compare-regen/`](specs/011-still-compare-regen/)、[`specs/012-solo-person-lock/`](specs/012-solo-person-lock/)、[`specs/013-hyperframes-cinema/`](specs/013-hyperframes-cinema/)、[`specs/014-cinema-studio-edit/`](specs/014-cinema-studio-edit/)、[`specs/015-saved-talks-nav/`](specs/015-saved-talks-nav/)、[`specs/016-hyperframes-native-compose/`](specs/016-hyperframes-native-compose/)

**主路径**：流式写文案并确认 → 写图片分镜文字并确认 → 按描述出图 → 对照文字可单张重做 → 生成口播 → 生成配乐 → 写电影合成稿 → 按时间轴合成视频。成片后可开时间轴编辑器微调再出片。口播落盘，顶部「我的口播」可回看进度。克隆静帧走火山方舟，文案/分镜/合成稿/口播/配乐走点物 Flow。成片优先用 HyperFrames 把 `compose/index.html` 渲成 MP4（契约：GSAP 时间轴、caption-highlight 词级字幕、`data-color-grading`），失败回退 ffmpeg。视频编辑用 HyperFrames Studio（C 端写「微调成片」）。视频模型出片不做，对嘴型数字人也不做。C 端不写厂商名。

**站点**：https://www.duaer.com

没有对应 `spec.md` / `plan.md` / `tasks.md`，不得大规模写业务代码。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
