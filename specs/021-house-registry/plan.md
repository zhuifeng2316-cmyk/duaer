# Plan: 自建组件库进向量，分镜墙能用

**Feature**: `021-house-registry`

## Architecture

```
确认文案
    ↓
按口播/屏幕字推断中文动作 → 自建库向量检索（回落官方目录）
    ↓
有图片槽：先出组件用图到 graphics/（无人脸）
    ↓
写分镜墙（模型只见中文动作名单）
    ↓
assignGraphics 填 graphicVars（含组件图路径）
    ↓
作者确认分镜 → 再出人物静帧
```

对照剪映图文脚本：镜头备注是中文，素材先备好再对稿。无新设置页。

## Test

- Unit: 自建库命中、图片槽路径、无槽组件不造图
- API: 确认文案后仍进入分镜墙 review
- Browser: 分镜墙中文动作，无英文 id
