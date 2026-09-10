# Implementation Plan: 文案定分镜 + 组件电影配色

**Feature**: `026-story-board-cinema`

对照：剪映图文成片按文案拆卡片，不是先切 5 等分；组件贴纸可以单独一卡。

## Flow

目标时长只是预算
文案按内容拆镜
分镜决定：人物底 / 只出组件 / 用哪个中文动作
宿主镜默认无底图
组件壳与系统槽位图锁电影大片
用户上传不改色

## Technical

- `planBoard` 只给预算和镜数上下限
- `parseScript` / `generateCopy` 不再补镜、不再等分秒数
- 分镜提示：宿主可空场景；组件只许电影大片
- `assignGraphics` 宿主默认 `hostStill: false`，可空 `imagePrompt`
- `CINEMA_GRAPHIC_TOKENS` 写入挂载 CSS 与颜色变量
- `graphicUploads` 标记上传槽，合成时跳过胶片滤镜
- 槽位出图用 `CINEMA_GRAPHIC_LOCK`，不用气质改风格

## Tests

- 1 镜不补成 5 镜；宿主无底图；色板；上传不加滤镜
- 浏览器墙上「组件」
