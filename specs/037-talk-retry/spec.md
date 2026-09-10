# Feature Specification: 失败后可重试

**Feature Branch**: `feature/019-registry-compose`

**Created**: 2026-09-10

**Status**: Active

**Input**: 出片失败后只能看着报错。要在失败后面加「重试」，从卡住的那步再走。

## User Scenarios & Testing

### User Story 1 - 失败后点重试 (P1)

口播出图或成片失败。工作台错误后面有「重试」。点了就从已有文案/分镜/画面接着做，不必从头开一条。

**Independent Test**: 一条失败口播打开工作台，错误旁能点重试，状态离开 failed。

## Requirements

- **FR-001**: 口播 `failed` 时，工作台错误文案后 MUST 有「重试」
- **FR-002**: 重试 MUST 按已有产物接着做：没文案写文案，有文案没分镜写分镜，有分镜没齐画面出图，画面齐了生成口播成片，已有合成稿则再合成。C 端不写厂商名
- **FR-003**: 正在跑的口播不得重复点重试

## Success Criteria

- **SC-001**: 单测锁定重试落在哪一步
- **SC-002**: 接口对 failed 口播返回离开失败
- **SC-003**: 浏览器在失败旁能看到并点「重试」
