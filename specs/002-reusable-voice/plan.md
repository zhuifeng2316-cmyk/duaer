# Plan: 可复用克隆音色

**Feature**: `002-reusable-voice`

## Architecture

音色落盘 `storage/voices/{id}/`，与单次出片项目分开。出片只引用 `voiceId`。

```
说话录音 + 名称
        ↓
   保存克隆音色
        ↓
  出片时点选复用
        ↓
  项目绑定 voiceId，口播用这条音色
```

## UI 对照（Mobbin 未连接）

| 模式 | 对照 | 用法 |
|---|---|---|
| 音色库点选 | 剪映/CapCut 音色列表 | 已保存的做成可点选胶囊，选中高亮 |
| 新建音色 | 剪映「我的音色」导入 | 名称 + 上传录音，存进库而不是一次性附件 |

## Tech

- `storage/voices/{id}/voice.json` + `sample.*`
- `GET/POST /api/voices`，`GET /api/voices/{id}/media`
- 项目增加 `voiceId`；传文件时先入库再绑定
- Vitest 单测 + 接口测；浏览器看列表与点选

## Gap

点物 Flow 当前无声音克隆模型。本 feature 先做可复用音色库与绑定；口播生成仍走现有语音能力，C 端不写厂商名。
