# Implementation Plan: 自建库收编官方稿

**Feature**: `035-house-fork-registry`

对照：剪映图文成片用自己的模板库，不把别人整个素材市场挂进成片。

无新页面。C 端仍只见中文动作。

## Flow

官方实验室只读拷贝 18 个 HTML（及手写字字体）→ `house/registry/`
副本刷中文默认句 + 电影色
`registryCatalog` / `rankRegistry` / `registryRel` 只打自建库
出片 `stageComposeMedia` 从 `house/registry` 拷
官方 `hf-registry-catalog.json` 不再被产品 import
以后加件：`scripts/fork-house-registry.mjs`
