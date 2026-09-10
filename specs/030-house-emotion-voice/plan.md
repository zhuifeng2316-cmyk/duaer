# Implementation Plan: 大片氛围与情绪口播

**Feature**: `030-house-emotion-voice`

对照：剪映配音页「推荐音色 / 我的」；CapCut Text to Speech 音色条。未装 Mobbin。

缺口：没有试听条（自带不落录音）。先点选再出片。

## 做法

- 导语改大片口吻
- `house-voices.ts` 六条预置；`GET /api/voices` 返回 `house`
- `speech-style.ts` 按镜/题材算指令和语速
- `openspeech` 自带音色走预置合成；克隆路径不变
- 首页「口播声音」：自带 + 我的克隆
