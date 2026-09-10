# Implementation Plan: 成片默认 2K，可选 4K

**Feature**: `023-output-quality`

对照：剪映 / CapCut 导出清晰度。本页只在画幅按钮旁加 2K / 4K，不新开页。

## Flow

首页选画幅 + 清晰度（默认 2K）
建口播写入 `quality`
出静帧 / 合成稿 / 封面 / 成片都读 `aspectSize(aspect, quality)`

## Technical

- `aspect.ts`：`QUALITIES`、`QUALITY_SIZE`、`parseQuality`、`aspectSize`
- 2K：9:16 1440×2560，3:4 1536×2048，1:1 2048×2048，4:3 2048×1536，16:9 2560×1440
- 4K：9:16 2160×3840，3:4 2160×2880，1:1 4096×4096，4:3 2880×2160，16:9 3840×2160
- `Project.quality`；旧口播缺字段按 2K
- 出图 `size` / `image_size` 跟清晰度走
- `cinemaTypeScale` 按画布宽度放大，不再封顶 1080

## Tests

- Unit: parse 4K；默认 2K；9:16 2K/4K 像素；字号随宽度变大
- API: 建口播默认为 2K；可带 4K
- Browser: 首页有 2K、4K，默认选中 2K
