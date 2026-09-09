# Plan: 可复用人物形象

**Feature**: `005-named-character`

## Architecture

独立人物库落盘 `storage/characters/{id}/`，对照已有音色库。抠图任务仍在 `storage/turns/{id}/`。存人物是复制，不移动，不打断当前任务。

```
一张人物照 → 抠头 → 起名 → 可选高清 / 八角
                 ↓
        存成人物（名字 + 头像 + 高清 + 原照 + 已有八角）
                 ↓
        出片点选人物 → 只把原头像/原照拷进项目当锁脸参考
```

## UI 对照（Mobbin 未连接）

| 模式 | 对照 | 用法 |
|---|---|---|
| 按人收图 | Apple Photos「人物」相册：一个人一个名字，底下是这个人的照片 | 一条人物收下头像和高清、八角 |
| 点选素材 | 剪映/CapCut 音色库、素材库：列表点选，不必每次上传 | 首页人物名+头像点选 |
| 起名 | Photos 给人命名：点名字就能改 | 待确认头像下直接改名 |

本 feature 不新开整页后台，只在首页加人物库和命名框。

## Tech

- 命名：`POST /api/turns/{id}/rename` `{ faceId, name }`
- 人物库：`GET/POST /api/characters`；媒体 `GET /api/characters/{id}/media?f=`
- 出片：`characterIds` 绑原裁切（及原照）；不绑八角生成图
- 单测：parse 名字、存/列/绑、rename；接口测：无参考拒绝、坏 id 拒绝；浏览器：命名框 + 列表

## Env

无新密钥。`FLOW_MOCK=1` 时仍可存人物（拷贝已有文件）。
