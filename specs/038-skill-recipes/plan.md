# Implementation Plan: 技能蒸馏成生成配方

**Feature**: `038-skill-recipes`

对照：剪映图文成片按模板选画面语言，作者不选底层插件名。未装 Mobbin。

## Flow

题材 → 配方 → 写文案 / 写分镜 / 检索组件 / 写成片稿。不读 SKILL.md。

## Technical

- `src/lib/skill-recipes.ts`：story / knowledge / product
- `copy.ts` `copyVoiceRule` 追加 copyBeats
- `housePromptLine` 只列 boardIntents
- `planHouseGraphics` / `resolveShotGraphic` 走配方 allowlist
- `alignShotMotions` + 知识/产品首镜砸钩子；字幕容器标记盖在画面上
