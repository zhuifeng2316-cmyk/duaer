# Plan: 按题材选用组件合成

**Feature**: `019-registry-compose`

## Architecture

```
要讲什么
    ↓ 推断题材 story | product | knowledge
确认文案
    ↓
写图片分镜：场景 + 图种 + 组法 + 可选组件（仅允许名单）
    ↓ 确认分镜
出图库 → 口播 → 配乐
    ↓
内置合成模版：组法拼静帧；block 做竖屏卡片；overlay 贴进该镜
    ↓ 实验室文件拷进 compose/
渲 MP4（失败回退 ffmpeg）
```

全库 399 项装在 `storage/hyperframes-registry/`（不入库）。产品只认允许名单。模型不得发明 id。

## UI 对照（Mobbin 未连接）

| 模式 | 对照 | 用法 |
|---|---|---|
| 分镜墙 | 剪映图文成片脚本 | 图下场景 + 组法 + 中文题材/组件，不是时间轴 |
| 成片区 | 剪映导出完成 | 能看能再出，没有后期时间轴 |

## Env

无新密钥。组件文件来自本地实验室；缺文件跳过。

## Test Plan

- Unit: 题材推断、允许名单、未知 id 丢弃、applyBoard 锁口播、合成稿卡片/overlay、竖屏字号
- API: 确认分镜仍出图
- Browser: 产品介绍分镜墙看到中文题材；无微调、无厂商名
