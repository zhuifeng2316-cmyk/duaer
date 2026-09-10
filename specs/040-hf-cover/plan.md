# Plan: 用时间轴封面模版重做封面

**Feature**: `040-hf-cover`

对照：剪映成片页换封面（缩略图预览再应用）；CapCut 项目封面用一张海报。未装 Mobbin。

## Architecture

```
上一张静帧 (stills 最后一张)
    + 作者选的封面模版（自建库标题卡 / 叠字稿）
    + 钩子标题
    ↓
选模版时：本条静帧 + 标题做缩略预览（不抓帧）
做成封面：cover-compose/index.html → snapshot --at 定住时刻（底栏叠字除外）
    ↓
cover.png + coverRev++
失败 → 原静帧叠字
```

成片页点「重新生成封面」先看预览选模版，再 `POST /api/projects/:id/cover` `{ template }` → `startRegenCover`。自动出封面仍走上次模版或标题卡锁定。

## Test

- Unit: 最后一张静帧、多种模版进稿、定住时刻、预览文案
- API: ready 可重做；无静帧 400
- Browser: 成片页能看到静帧预览并做成封面
