# Feature Specification: 文案确认后再写分镜，人物可起名

**Feature Branch**: `feature/009-confirm-copy`

**Created**: 2026-09-09

**Status**: Active

**Input**: 作者先写这条口播要讲什么。系统只根据这句话写出口播文案（钩子、屏幕字、画外音）。作者确认文案之后，才写图片分镜并继续出片。已保存人物和抠出的头像都能起名。C 端不写模型或通道名。禁止视频模型出片，禁止对嘴型。

## User Scenarios & Testing

### User Story 1 - 先写要讲什么，再出文案 (P1)

作者填写「要讲什么」，点先写文案。系统只写口播文案，不写画面。墙上出现钩子、每镜口播和屏幕字，停住等确认。

**Why this priority**: 文案没定就出分镜，画面会跟口播拧巴。

**Independent Test**: mock 出片后项目停在待确认，script 有口播无分镜画面文件。

**Acceptance Scenarios**:

1. **Given** 已填要讲什么并有人物，**When** 先写文案完成，**Then** 能看到钩子与每镜口播/屏幕字，尚未生成分镜静图
2. **Given** 文案待确认，**When** 未点确认，**Then** 不写图片分镜、不出分镜图
3. **Given** 未写要讲什么（少于 4 字），**When** 提交，**Then** 拒绝

### User Story 2 - 确认文案后再写图片分镜 (P1)

作者点「确认文案，写图片分镜」。系统按已定文案补场景和构图，不得改口播和屏幕字，然后按镜出图并继续成片。

**Acceptance Scenarios**:

1. **Given** 文案待确认，**When** 确认，**Then** 才进入图片分镜并随后出图
2. **Given** 文案待确认，**When** 点重写文案，**Then** 按同一句要讲什么再写一版文案，仍停在待确认
3. **Given** 文案尚未写好，**When** 确认分镜，**Then** 拒绝

### User Story 3 - 人物能起名 (P1)

抠出的头像能起名。已保存的人物也能改名。名字出现在列表上。

**Acceptance Scenarios**:

1. **Given** 已抠头像，**When** 起名「阿宁」，**Then** 标签变为阿宁
2. **Given** 已保存人物，**When** 改名为「阿宁」，**Then** 列表与详情都是阿宁
3. **Given** 名字为空，**When** 保存，**Then** 保留原名

## Requirements

- **FR-001**: 出片第一步 MUST 只写口播文案；C 端禁止出现模型/通道名
- **FR-002**: 文案写完 MUST 停在待确认（`review`）；未确认不得写图片分镜、不得出分镜静图
- **FR-003**: `POST /api/projects/{id}/confirm` 仅在待确认且已有文案时，才写图片分镜并继续出片
- **FR-004**: `POST /api/projects/{id}/rewrite` 仅在待确认时按原「要讲什么」重写文案
- **FR-005**: 图片分镜不得改已确认的 hook / cta / voiceover / onScreenText
- **FR-006**: 抠出的头像与已保存人物 MUST 能起名（1–16 字）；`PATCH /api/characters/{id}` `{ name }`
- **FR-007**: 首页文案区必须写清：先写要讲什么 → 写文案 → 确认后再写图片分镜

## Success Criteria

- **SC-001**: 不确认文案就不会出现分镜静图
- **SC-002**: 确认后分镜口播与确认稿一致
- **SC-003**: 浏览器能看到待确认文案和人物改名

## Assumptions

- 写文案走现有文案模型配置，C 端不提模型名
- UI 对照剪映：先出文案稿，用户点用这篇再铺分镜
