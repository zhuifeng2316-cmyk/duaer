# Plan: 口播字幕样式可预览可单条改

**Feature**: `041-caption-styles`

对照：剪映字幕样式缩略预览再应用到全片或单条。未装 Mobbin。

## Architecture

```
自建库 caption-*（17）+ 电影字 35 + 特效字 24 + 气质条 13 + 动效字 24 + 片卡字 10 + 更多字 16
    ↓
caption-styles.ts（中文名 + 家族 slam/editorial/wipe/weight/highlight + 皮肤）
    ↓
Project.captionStyle 全片
Shot.captionStyle 单镜覆盖
    ↓
buildShotCaptions.skin + fallbackCinemaHtml 词级层
选样式时：静帧 + 屏幕字 CSS 预览（带短循环动效，不抓帧）
分镜墙：每张静帧按当前样式叠同一层预览（同样会动）
已有合成稿：rewriteCinemaHtml；成片画面要换再出一次片
```

`POST /api/projects/:id/captions` `{ style, shotIndex? }`。无 `shotIndex` 写全片；有则只写该镜。

## Test

- Unit: 139 种目录、全片/单镜 skin、自动回退、预览 keyframes
- API: 可写全片和单镜
- Browser: 预览网格能选全片或单条；缩略图与墙上叠字在动
