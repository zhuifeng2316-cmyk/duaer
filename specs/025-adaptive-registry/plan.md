# Implementation Plan: 组件按成片画幅自适应

**Feature**: `025-adaptive-registry`

对照：剪映图文成片里贴纸跟画幅走。组件铺满当前成片，不另开页。

## Flow

检索只从自建库 + 允许名单
宿主组件各画幅都能配
挂载铺满成片画布（不写死官方像素）
非法名跳过仍出片

## Technical

- `houseFitsFamily`：宿主/自适应组件各画幅都算适合
- `rankRegistry` / `assignGraphics` 只留可配名
- `registryMountSize(name, talk)`：自适应则 `hostFill`
- `clipRegistryMarkup` 用 overlay 铺满
- 合成时丢掉库外名字

## Tests

- 9:16 配轮播；hostFill；非法 block 不进稿
- 分镜墙竖屏可见「轮播」
