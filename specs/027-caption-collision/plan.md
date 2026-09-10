# Implementation Plan: 成片字幕不得重叠

**Feature**: `027-caption-collision`

对照：剪映图文成片一卡一层大字，不把标题和花字叠死。

## Flow

先看这一镜有没有字幕组件，且已写进本镜中文 → 有则只出组件
写不进 → 不挂官方演示稿，改用本镜口播词/海报
全屏砸字 → 不出海报
屏幕字≈口播 → 只出口播词
海报只贴顶部，避开通知右上
词与词、镜与镜时间错开

## Technical

- `isCaptionGraphic` + `planShotLettering`
- `buildPosterCards` / `buildShotCaptions` 按计划裁
- 砸字 JS 一词隐掉再出下一词
