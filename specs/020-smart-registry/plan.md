# Plan: 按动作智能选组件一次出片

**Feature**: `020-smart-registry`

## Architecture

```
分镜：场景/组法 + 中文画面动作
    ↓
中文动作 → 英文检索词（词表）
    ↓
本地目录打分（name/title/description/tags）+ 题材过滤 + 黑名单
    ↓
读实验室 HTML 的 data-composition-variables
    ↓
按口播/屏幕字填 graphicVars
    ↓
内置稿：data-composition-src + data-variable-values
```

不出片时再 `hyperframes add`。实验室已全装。检索在本地做，不把 399 个英文名塞给模型。

## UI

分镜墙多一句中文动作，对照剪映图文脚本的镜头备注。无新设置页。

## Test

- Unit: 下拉刷新 / 通知 / 故事不误配；变量解析与填充
- API: 确认分镜仍出图
- Browser: 分镜墙中文动作，无英文 id，无微调
