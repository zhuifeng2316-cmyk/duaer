# Feature Specification: 成片默认 2K，可选 4K

**Feature Branch**: `feature/019-registry-compose`

**Created**: 2026-09-10

**Status**: Active

**Input**: 成片清晰度不够。默认按 2K 出静帧和成片，首页可选 4K。

## User Scenarios & Testing

### User Story 1 - 默认 2K (P1)

新建口播不选清晰度时，静帧、合成稿、封面、成片都按 2K 像素出，不再落到 1080p。

**Independent Test**: 默认 9:16 成片宽高是 1440×2560。

### User Story 2 - 可选 4K (P1)

出片前可点 4K。该条口播的静帧、合成稿、封面、成片都按 4K 像素出。旧口播没写清晰度的按 2K。

**Independent Test**: 选 4K + 9:16 时宽高是 2160×3840。

## Requirements

- **FR-001**: MUST 支持清晰度 `2K` `4K`；默认 `2K`；C 端只写 2K / 4K
- **FR-002**: 静帧出图、合成稿画布、ffmpeg 回退、封面 MUST 用同一清晰度像素
- **FR-003**: 屏幕字随画布变大，2K / 4K 不得比 1080p 更小
- **FR-004**: 人物形象包静帧保持 2K，不跟成片 4K 走

## Success Criteria

- **SC-001**: 单测锁定默认 2K 像素、4K 像素、旧口播回落 2K
- **SC-002**: 首页能点 2K / 4K，默认是 2K
