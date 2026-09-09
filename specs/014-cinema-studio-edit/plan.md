# Plan: 成片时间轴编辑

**Feature**: `014-cinema-studio-edit`

## Architecture

```
成片 ready（compose/index.html 已在）
        ↓
  点「微调成片」→ 本机预览服务打开 compose/
        ↓
  页面 iframe / 新窗口进时间轴编辑器
        ↓
  点「按时间轴再出片」→ 不重写 HTML，只渲 final.mp4
```

## UI 对照（Mobbin 未连接）

| 模式 | 对照 | 用法 |
|---|---|---|
| 成片后编辑 | 剪映图文成片：导出前可进时间轴 | 成片播放器下方「微调成片」 |
| 时间轴 | CapCut 时间轴铺在画面下 | iframe 嵌入；可新窗口打开 |

C 端不出现引擎名。

## Tech

- `POST /api/projects/:id/edit`：对 `compose/` 起预览（端口默认 4570，避开 3002），返回 `editUrl`
- `POST /api/projects/:id/assemble`：`writeAndRenderCinema({ reuseHtml: true })`
- 预览 CLI 隔离在 `cinema-studio.ts`；`page.tsx` / `pipeline.ts` 无厂商名
- 单测：解析预览 URL、无稿 400；接口测再出片不覆盖稿；浏览器：成片区有微调入口
