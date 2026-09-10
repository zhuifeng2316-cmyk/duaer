# Implementation Plan: 自建库组件大片验收

**Feature**: `033-cinema-house-audit`

对照：剪映图文成片里的卡片是暗部道具，不是后台白屏。

## Flow

遍历 houseCatalog
官方源只读：检出白底与英文演示
合成副本：中文皮肤 + 电影色板 + 白底胶片滤镜
字幕组件无中文则不挂
有字组件关掉口播字层
槽位提示锁电影大片
