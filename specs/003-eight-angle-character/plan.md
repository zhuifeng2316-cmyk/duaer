# Plan: 一张图拆八个角度

**Feature**: `003-eight-angle-character`

## Architecture

独立任务落盘 `storage/turns/{id}/`。分两步，第二步必须等人确认。

```
一张人物照
    ↓
裁出画面里每一颗头（原图像素，不重画）
    ↓
勾选一个人或多个人 → 可选：修原图高清（放大 + 轻度去糊，不重绘、不加重锐化）
    ↓ 选 1 人并确认
八方向头肩像
    ↓ 选多人
用选中的头像出片（分镜可多人同框）
```

状态：`queued` → `cutting` → `review` → `enhancing` → `review` → `running` → `ready`（单张重做为 `rerunning` → `ready`；失败为 `failed`）

## UI 对照（Mobbin 未连接）

| 模式 | 对照 | 用法 |
|---|---|---|
| 先确认素材 | 剪映图文成片：先看选中素材再生成 | 右墙一张头像 +「确认这张头像」 |
| 八方向人设 | 游戏角色转面 | 确认后 4×2 宫格 |

## Tech

- 认头框 → ffmpeg 从原图 crop；失败则退回原图拷贝
- 高清：ffmpeg 修原裁切，不调用出图模型
- `POST /api/turns` 抠出所有头；`POST /api/turns/{id}/select` 勾选；`POST /api/turns/{id}/enhance` 高清选中；`POST /api/turns/{id}/confirm` 仅单人转面；`POST /api/turns/{id}/regen` 只重做一张八角图
- Vitest：头框解析 + 未确认拒绝转面；浏览器看入口与待确认
