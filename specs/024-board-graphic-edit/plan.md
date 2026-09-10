# Implementation Plan: 分镜墙改组件

**Feature**: `024-board-graphic-edit`

对照：剪映图文成片脚本区改素材，不是时间轴。本页只在分镜墙加开关、槽位、参数。

## Flow

写分镜时标宿主/透叠
宿主镜默认不出人物静帧，墙上可开「人物底」
槽位：上传或系统出真实界面
参数：中文改 `graphicVars`
确认出图只给需要人物底的镜子出克隆图
合成稿：无底图则空底 + 组件

## Technical

- `Shot.hostStill`；`graphicIsHost` / `shotNeedsPersonStill`
- `POST /api/projects/:id/graphic`：人物底、参数、槽位上传/出图
- `generateGraphicSlot` 走出图通道，提示写真实界面
- `clipStillMarkup` 无 `stillRel` 不写假图
- 分镜墙与出图墙共用组件栏

## Tests

- Unit: 宿主默认关、透叠开、空底合成稿
- API: graphic 改开关/参数/槽位
- Browser: 分镜墙有人物底与槽位，无英文 id
