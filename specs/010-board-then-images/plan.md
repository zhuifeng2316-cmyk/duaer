# Plan: 先写分镜文字，确认后再出图；文案流式输出

**Feature**: `010-board-then-images`

## Architecture

出片拆成三段：

```
要讲什么 → 流式写文案 → 停住确认
                         ↓ 确认文案
              只写分镜文字（场景/构图 prompt）→ 停住确认
                         ↓ 确认分镜
              按确认的文字出图 → 口播 → 配乐 → 合成稿 → 成片
```

`status=review` + `phase=copy`：等确认文案。  
`status=review` + `phase=board`：等确认分镜文字。  
`POST confirm` 按 phase 分叉。`draftText` 在写文案（及写分镜）时持续更新。

## UI 对照（Mobbin 未连接）

| 模式 | 对照 | 用法 |
|---|---|---|
| 文案流式 | 剪映图文成片 / ChatGPT 打字机 | 墙上逐句出现钩子和口播 |
| 分镜脚本 | 剪映：先出分镜文案再配图 | 每镜展示场景文字，确认后才出图 |

## Tech

- `flowChat` 增加 `stream: true` + SSE 增量；失败回退非流式
- `Project.draftText`；写文案时节流写入，首页 300ms 轮询
- `startAfterCopy` 只 `generateBoard` 后停在 review/board
- `startAfterBoard` 从出图接到成片
- Vitest：流式草稿、确认文案不出图、确认分镜才出图；浏览器看流式文案和文字分镜

## Gap

无独立声音复刻模型，与本 feature 无关。
