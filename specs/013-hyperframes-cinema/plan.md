# Plan: 电影合成稿按时间轴渲成片

**Feature**: `013-hyperframes-cinema`

## Architecture

```
口播 + 配乐就绪
        ↓
  大模型写 HTML 合成稿（失败 → 内置大片模版）
        ↓
  落盘 compose/index.html，媒体链到合成目录
        ↓
  优先：HTML 时间轴渲染器 → final.mp4
        ↓ 失败 / mock
  回退：ffmpeg 静图运动 + 混音 → final.mp4
```

渲染器只吃已生成的静帧、口播、配乐。不走出图模型，不走视频模型。

## UI 对照（Mobbin 未连接）

| 模式 | 对照 | 用法 |
|---|---|---|
| 出片进度 | 剪映图文成片 | 仍「在写合成稿…」「在合成视频…」，不展示源码或引擎名 |
| 字幕 | CapCut 下部安全区 | 左右约 8%，底部约 13%，避开操作条 |
| 画幅 | CapCut 9:16 / 1:1 / 16:9 | 合成稿 `data-width/height` 与选择一致；横屏可加宽银幕遮幅 |

无新页面。

## Tech

- 合成稿：`fallbackCinemaHtml` 写成可渲的时间轴文档；含胶片 `data-color-grading`、颗粒/暗角层、Ken Burns CSS（push/pull/pan/punch）、字幕淡入、钩子/CTA、口播+配乐
- 路径：合成根目录 `compose/`，静帧 `stills/shot-N.png`，口播 `speech.wav`，配乐 `bgm.mp3`（符号链接或复制，不用 `../`）
- 渲染：本机 CLI 对 `compose/index.html` 出 `final.mp4`；`FLOW_MOCK=1` 或 `CINEMA_HTML_RENDER=0` 跳过，走 ffmpeg
- C 端文件（`page.tsx` / `pipeline.ts` / `copy.ts` / `speech.ts`）不出现厂商名；CLI 调用隔离在渲染模块
- 单测：大片要素、校验回退、mock 跳过渲染器；接口测 mock 仍出 mp4

## Env

```
FLOW_MOCK=1              # 测试，跳过渲染器
CINEMA_HTML_RENDER=0     # 强制 ffmpeg 兜底
```

C 端禁止出现通道或厂商名。
