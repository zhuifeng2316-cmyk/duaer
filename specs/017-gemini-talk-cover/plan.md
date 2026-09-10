# Plan: 成片封面

**Feature**: `017-gemini-talk-cover`

## Architecture

```
成片 final.mp4
    ↓
phase=cover「在做封面…」
    ↓
选一张成片静帧（优先近景/特写）
    ↓
裁成成片画幅 + 上沿压暗 + 叠钩子大标题
    ↓
cover.png + coverPath
    ↓
列表 thumbUrl / 播放器 poster
失败 → 成片仍 ready，thumb 回退 stills[0]
```

封面不再重绘人物：静帧是脸，ffmpeg 只叠字。

## UI 对照（Mobbin 未连接）

| 模式 | 对照 | 用法 |
|---|---|---|
| 列表封面 | 剪映草稿箱 / CapCut 项目 | 竖图封面 + 标题，不是空灰块 |
| 播放器 | 常见短视频未播海报 | `video poster` 用封面 |

## Env

无需额外出图密钥。mock 与真出片同一条静帧叠字路径。

## Test Plan

- Unit: 封面标题截取、近景选片、卡片优先封面
- API: mock 成片后 `coverUrl` / 列表 `thumbUrl` 含 cover
- Browser: 「我的口播」卡片与成片播放器海报是静帧里的人
