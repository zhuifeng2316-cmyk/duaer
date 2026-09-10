# Duaer Agent Notes

**产品核心**：人不出镜的 AI 口播。照片克隆画面，声音克隆口播，文案/分镜/配乐都来自 AI。

开发必须遵守：

1. [`.specify/memory/constitution.md`](.specify/memory/constitution.md)
2. [`.cursor/rules/spec-driven-development.mdc`](.cursor/rules/spec-driven-development.mdc)

流程：`specify` → `plan` → `tasks` → `implement`（单测 + 接口测 + 浏览器 E2E）。
当前 feature：[`specs/001-clone-cut-video/`](specs/001-clone-cut-video/)、[`specs/002-reusable-voice/`](specs/002-reusable-voice/)、[`specs/003-eight-angle-character/`](specs/003-eight-angle-character/)、[`specs/004-ark-html-compose/`](specs/004-ark-html-compose/)、[`specs/005-named-character/`](specs/005-named-character/)、[`specs/006-sqlite-library/`](specs/006-sqlite-library/)、[`specs/007-character-views/`](specs/007-character-views/)、[`specs/008-voice-record/`](specs/008-voice-record/)、[`specs/009-confirm-copy/`](specs/009-confirm-copy/)、[`specs/010-board-then-images/`](specs/010-board-then-images/)、[`specs/011-still-compare-regen/`](specs/011-still-compare-regen/)、[`specs/012-solo-person-lock/`](specs/012-solo-person-lock/)、[`specs/013-hyperframes-cinema/`](specs/013-hyperframes-cinema/)、[`specs/014-cinema-studio-edit/`](specs/014-cinema-studio-edit/)、[`specs/015-saved-talks-nav/`](specs/015-saved-talks-nav/)、[`specs/016-hyperframes-native-compose/`](specs/016-hyperframes-native-compose/)、[`specs/017-gemini-talk-cover/`](specs/017-gemini-talk-cover/)、[`specs/018-still-compose-plan/`](specs/018-still-compose-plan/)、[`specs/019-registry-compose/`](specs/019-registry-compose/)、[`specs/020-smart-registry/`](specs/020-smart-registry/)、[`specs/021-house-registry/`](specs/021-house-registry/)、[`specs/022-aspect-fit-registry/`](specs/022-aspect-fit-registry/)、[`specs/023-output-quality/`](specs/023-output-quality/)、[`specs/024-board-graphic-edit/`](specs/024-board-graphic-edit/)、[`specs/025-adaptive-registry/`](specs/025-adaptive-registry/)、[`specs/026-story-board-cinema/`](specs/026-story-board-cinema/)、[`specs/027-caption-collision/`](specs/027-caption-collision/)、[`specs/028-cinema-component-skin/`](specs/028-cinema-component-skin/)、[`specs/029-talk-plans/`](specs/029-talk-plans/)、[`specs/030-house-emotion-voice/`](specs/030-house-emotion-voice/)、[`specs/031-home-wall-preview/`](specs/031-home-wall-preview/)、[`specs/032-cinema-hook-lettering/`](specs/032-cinema-hook-lettering/)、[`specs/033-cinema-house-audit/`](specs/033-cinema-house-audit/)、[`specs/034-poster-still-lettering/`](specs/034-poster-still-lettering/)、[`specs/035-house-fork-registry/`](specs/035-house-fork-registry/)、[`specs/036-house-fork-all/`](specs/036-house-fork-all/)、[`specs/037-talk-retry/`](specs/037-talk-retry/)、[`specs/038-skill-recipes/`](specs/038-skill-recipes/)、[`specs/039-board-director/`](specs/039-board-director/)、[`specs/040-hf-cover/`](specs/040-hf-cover/)、[`specs/041-caption-styles/`](specs/041-caption-styles/)、[`specs/042-recipe-cinema-pipeline/`](specs/042-recipe-cinema-pipeline/)、[`specs/043-talk-assist/`](specs/043-talk-assist/)

**主路径**：流式写文案并确认 → 写故事分镜（场景/图种/组法，可按题材叠允许名单里的组件）并确认 → 按描述出图库 → 对照文字可单张重做 → 生成口播 → 生成配乐 → 按组法用内置合成稿拼图库 → 出封面。一步出大片，不做时间轴微调。画面语言按题材（故事口播 / 产品介绍 / 知识输出）从组件库挑：分镜写中文动作，系统检索并填参数，C 端只写中文标签。口播落盘，顶部「我的口播」可回看进度。克隆静帧走火山方舟，文案/分镜/口播/配乐走点物 Flow，封面用静帧叠标题锁脸。成片优先用 HyperFrames 把 `compose/index.html` 渲成 MP4（契约：GSAP 时间轴、词级字幕、`data-color-grading`），封面用时间轴命令把最后一张静帧叠标题卡锁定抓成海报，失败回退 ffmpeg。视频模型出片不做，对嘴型数字人也不做。C 端不写厂商名。

**站点**：https://www.duaer.com

没有对应 `spec.md` / `plan.md` / `tasks.md`，不得大规模写业务代码。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
