# Plan: 文案确认后再写分镜，人物可起名

**Feature**: `009-confirm-copy`

## Architecture

把出片拆成两段。第一段只 `generateCopy`，项目 `status=review`。确认后第二段 `generateBoard` → 出图 → 口播 → 配乐 → 合成稿 → 成片。

```
要讲什么 → 写文案 → 停住确认
                 ↓ 确认
            写图片分镜 → 出图 → … → 成片
```

人物改名：抠图任务已有 rename；已保存人物补 `PATCH /api/characters/{id}`。

## UI 对照（Mobbin 未连接）

| 模式 | 对照 | 用法 |
|---|---|---|
| 文案稿确认 | 剪映图文成片：先出文案，点用这篇再配图 | 墙上展示口播稿，确认后才铺分镜墙 |
| 人物改名 | Apple Photos 点名字 | 头像下改名；已保存人物在形象墙改名 |

C 端只说「写文案」，不写模型名。

## Tech

- `ProjectStatus` 增加 `review`
- `startProduce` 只写文案；`startAfterCopy` 从分镜接着跑
- `POST /api/projects/{id}/confirm`、`POST /api/projects/{id}/rewrite`
- `PATCH /api/characters/{id}` `{ name }`
- 单测：copy 停、confirm 才 board；改名；浏览器看确认按钮且无模型名
