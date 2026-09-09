# Feature Specification: 先写分镜文字，确认后再出图；文案流式输出

**Feature Branch**: `feature/010-board-then-images`

**Created**: 2026-09-09

**Status**: Active

**Input**: 图片分镜是每镜的场景/构图文字（prompt 描述），不是直接出图。作者确认这些文字之后，才按描述生成静图。写口播文案时，墙上必须流式出现正在写的内容。C 端不写厂商名。禁止视频模型出片，禁止对嘴型。

## User Scenarios & Testing

### User Story 1 - 文案边写边出现 (P1)

作者点「先写文案」后，右边立刻逐句出现钩子、屏幕字和口播，而不是空白等到全部写完。

**Why this priority**: 等整篇 JSON 一次吐完，作者以为卡住了。

**Independent Test**: mock 写文案过程中项目带有可读的 draft 文本，完成后才进入待确认。

**Acceptance Scenarios**:

1. **Given** 已提交要讲什么，**When** 正在写文案，**Then** 墙上能看到正在增加的口播文字
2. **Given** 文案写完，**When** 进入待确认，**Then** 看到完整钩子、每镜口播和屏幕字，仍无分镜静图

### User Story 2 - 图片分镜先是文字 (P1)

作者确认文案后，系统只写每镜的场景和画面描述，停住等确认。此时还没有分镜静图。

**Why this priority**: 分镜若直接出图，改一场戏就要重画；先定文字风景，出图才跟得上口播。

**Independent Test**: 确认文案后项目再次停在待确认，script 有 scene/imagePrompt，stillUrls 仍为空。

**Acceptance Scenarios**:

1. **Given** 文案已确认，**When** 图片分镜写完，**Then** 墙上是每镜的场景文字，没有静图
2. **Given** 分镜文字待确认，**When** 未点确认出图，**Then** 不调用出图
3. **Given** 分镜文字待确认，**When** 点重写分镜，**Then** 按已定文案再写一版场景描述，仍不出图

### User Story 3 - 确认分镜文字后再出图 (P1)

作者点「确认分镜，开始出图」。系统按已确认的 imagePrompt/scene 生成静图，再继续口播、配乐、合成稿、成片。

**Acceptance Scenarios**:

1. **Given** 分镜文字待确认，**When** 确认出图，**Then** 才开始按镜生成静图
2. **Given** 分镜尚未写好，**When** 确认出图，**Then** 拒绝

## Requirements

- **FR-001**: 写口播文案 MUST 把正在生成的内容流式写到项目草稿，C 端轮询可见；禁止厂商名
- **FR-002**: 确认文案之后 MUST 只写图片分镜文字（scene / imagePrompt / motion），不得改 hook / cta / voiceover / onScreenText
- **FR-003**: 分镜文字写完 MUST 再停在待确认；未确认不得出分镜静图
- **FR-004**: `POST /api/projects/{id}/confirm` 在文案待确认时只启动写分镜文字；在分镜待确认时才启动出图
- **FR-005**: `POST /api/projects/{id}/rewrite` 在文案待确认时重写文案；在分镜待确认时重写分镜文字
- **FR-006**: 出图 MUST 使用已确认的 imagePrompt/scene，不得在未确认时按镜出图
- **FR-007**: C 端分镜确认区只展示文字风景描述，不出现「克隆中」占位图

## Success Criteria

- **SC-001**: 写文案时浏览器能看到文字陆续出现
- **SC-002**: 确认文案后、确认分镜前，没有任何分镜静图
- **SC-003**: 确认分镜后才出现静图并继续成片

## Assumptions

- 文案/分镜仍走现有文案模型配置，C 端不提模型名
- UI 对照剪映图文成片：先出文案，再出分镜脚本，点用这篇才配图
