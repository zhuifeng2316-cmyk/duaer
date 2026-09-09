# Plan: 合成稿按时间轴框架契约出片

**Feature**: `016-hyperframes-native-compose`

## Architecture

```
剪辑表（静帧/口播/配乐/每镜口播句）
        ↓
  内置契约模版（失败的模型稿回退到此）
        ↓
  compose/index.html
        ↓
  优先时间轴渲染器 → final.mp4
```

## UI 对照

无新页面。字幕对照该框架官方 `caption-highlight`（下部词组、当前词扫过高亮），不是剪映自制安全区百分比。

## Tech

- 根节点：`data-composition-id="cinema"` + 画幅时长；一份 `gsap.timeline({ paused: true })` 注册到 `window.__timelines["cinema"]`
- 每镜：`<section class="clip">` 包一张 `<img>`；运动 tween 打在 img 上，不改 clip 显隐
- 字幕：口播句（否则屏幕字）拆词，注入与 `caption-highlight` 相同的 `hl-group` / `hl-word` / `hl-word-bg` 时间轴
- 胶片：沿用 `data-color-grading`（grain / vignette 在 details）
- 允许 CDN：jsDelivr GSAP 3.14.2、Google Fonts Montserrat（中文回退系统黑体）
- 校验拒绝：无时间轴根属性、ken-push 关键帧、非白名单外链
- C 端与模型 system 不写厂商名
