# Plan: 在线录音克隆音色

**Feature**: `008-voice-record`

## Architecture

音色库不变。采集只走 `MediaRecorder` + 麦克风。保存仍 `POST /api/voices`。出片只绑 `voiceId`。

```
麦克风 → 录 ≥10 秒 → 试听 → 存成音色
出片点选 voiceId（禁止再带音频文件）
```

## UI 对照（Mobbin 未连接）

| 模式 | 对照 | 用法 |
|---|---|---|
| 录制音色 | 剪映/CapCut 录制我的声音：按住或点开始/停止 | 开始录音 / 停录 / 重录 |
| 音色库 | 剪映音色列表点选 | 已保存胶囊，出片点选 |

## Tech

- 首页去掉 `input type=file` 音频
- `MediaRecorder` 优先 `audio/webm`，否则 `audio/mp4`
- 出片路由拒绝 `voice` 字段
- 单测时长规则；接口测拒绝出片附带文件；浏览器确认无上传入口

## Env

无新密钥。录音需用户授权麦克风。
