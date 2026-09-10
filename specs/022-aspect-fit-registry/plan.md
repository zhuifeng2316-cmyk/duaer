# Implementation Plan: 画幅补 4:3 / 3:4，组件按比例分档

**Feature**: `022-aspect-fit-registry`

对照：剪映 / CapCut 画幅选择（9:16、3:4、1:1、4:3、16:9）。本页只在现有比例按钮旁加两项，不新开页。

## Flow

成片画幅 → 归成竖/方/横
自建库 `fits`（无则按官方宽高/图种推断）
只检索当前族组件 → 分镜提示只列这些中文动作

## Technical

- `aspect.ts`：`3:4` 1080×1440，`4:3` 1440×1080；`aspectFamily`
- 出图像素：`3:4` 1536×2048，`4:3` 2048×1536
- 自建库每条 `fits`
- `rankRegistry` / `assignGraphics` / `housePromptLine` 吃画幅
- 分镜墙海报：3:4 用竖图框，4:3 用横图框

## Tests

- Unit: parse 4:3/3:4；竖屏不配轮播；横屏配轮播
- API: 建口播可带 4:3
- Browser: 首页有 4:3、3:4
