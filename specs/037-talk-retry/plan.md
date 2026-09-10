# Implementation Plan: 失败后可重试

**Feature**: `037-talk-retry`

对照：剪映导出失败后的「重试」。未装 Mobbin。

## Flow

工作台展示错误 → 点重试 → 按文案/分镜/画面/合成稿接着跑

## Technical

- `retryProduceKind` 看 script / stills / htmlPath
- `POST /api/projects/:id/retry` 仅 `failed`
- 工作台错误后加「重试」
