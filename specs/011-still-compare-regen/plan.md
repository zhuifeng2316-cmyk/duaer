# Plan: 分镜画面对照文字并可单张重做

**Feature**: `011-still-compare-regen`

## Architecture

出图结束后停在 `status=review` `phase=images`。墙上每张静图配该镜 `imagePrompt`。`POST regen { shotIndex }` 只重画一张。确认后再 `startAfterStills` 走口播。

```
确认分镜文字 → 按镜出图 → 停住对照
                 ↓ 可重做某一张
            确认画面 → 口播 → 配乐 → 合成稿 → 成片
```

## UI 对照（Mobbin 未连接）

| 模式 | 对照 | 用法 |
|---|---|---|
| 图下文 | 剪映图文成片：画面下挂文案 | figcaption 展示完整场景描述 |
| 单条替换 | 剪映替换素材 | 「重做这张」，其它镜不动 |

## Tech

- `Project.stillRev`、`regenShotIndex`
- `produceFromImages` 出齐后停；`produceFromSpeech` 从口播接着跑
- `POST /api/projects/{id}/regen`
- 静图 URL 带 `v=stillRev` 破缓存
- 成片后重做则只重合成 clips + final
- 单测 + 接口测 + 浏览器看图下文案和重做按钮
