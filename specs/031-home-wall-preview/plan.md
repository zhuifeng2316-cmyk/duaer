# Implementation Plan: 首页成片墙与试听

**Feature**: `031-home-wall-preview`

对照：剪映图文成片首页（模板墙 + 我的草稿）；CapCut 推荐音色可试听。未装 Mobbin。

## Flow

自带音色点播放 → 拉试听音频 → 只播这一条
左侧：人物 / 声音 / 画幅清晰度时长 / 一句话 / 先写文案
右侧：别人做的成片墙。自己的口播在「我的视频」

## Technical

- `publicHouseVoices` 带 `sampleUrl`
- `ensureHousePreview` 首次用自带通道念一句「大片来袭，小白也能做专业片」
- `GET /api/voices/:id/media` 认 house id
- `GET /api/projects` 增加 `wall`（ready 且有成片或封面）
- 首页右侧换墙，左侧收紧；录音放在折叠里
