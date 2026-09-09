# Feature Specification: 可复用克隆音色

**Feature Branch**: `feature/002-reusable-voice`

**Created**: 2026-09-09

**Status**: Active

**Input**: 克隆音色不是每次出片临时传一段录音。要做成可复用功能：建好一条音色，之后每条口播都能选它。

## User Scenarios & Testing

### User Story 1 - 存一条音色，下次还能用 (P1)

作者上传一段说话、起个名字，保存成克隆音色。首页能看到这条音色。再出片时直接点选，不必重传录音。

**Why this priority**: 没有可复用音色，声克隆只是一次性附件。

**Independent Test**: 保存音色 → 列表出现 → 再创建项目时带上该音色 id。

**Acceptance Scenarios**:

1. **Given** 未上传录音，**When** 保存音色，**Then** 拒绝并提示需要说话录音
2. **Given** 已上传合法录音并命名，**When** 保存，**Then** 音色出现在列表，可试听
3. **Given** 已有保存的音色，**When** 出片并选中它，**Then** 项目绑定该音色，不必再传文件

### User Story 2 - 出片时选用音色 (P1)

出片表单展示已保存音色。点选一条后开始出片。无音色仍可出片（口播照样生成）。

**Acceptance Scenarios**:

1. **Given** 音色列表非空，**When** 打开首页，**Then** 能看到音色名并可点选
2. **Given** 选中一条音色，**When** 提交出片，**Then** 项目记录该 `voiceId`
3. **Given** 传入不存在的 `voiceId`，**When** 创建项目，**Then** 拒绝

## Requirements

- **FR-001**: 必须能用一段 mp3/wav/m4a/webm 说话录音创建克隆音色，单条 ≤ 12MB
- **FR-002**: 音色必须有名称（1–16 字）；未填则用「我的音色」
- **FR-003**: 最多 12 条音色；超出拒绝
- **FR-004**: `GET /api/voices` 返回已保存音色列表与上次选用的 id
- **FR-005**: `POST /api/voices` 保存新音色；非法文件拒绝
- **FR-006**: 出片 `POST /api/projects` 可带 `voiceId` 复用已保存音色；也可仍传 `voice` 文件（自动存进音色库再绑定）
- **FR-007**: 出片不强制选音色
- **FR-008**: C 端禁止厂商名；只说「克隆音色」
- **FR-009**: 选中的音色可在出片前试听参考录音

### Key Entities

- **VoiceClone**: id、name、sample、createdAt
- **Project.voiceId**: 选用的音色，可空

## Success Criteria

- **SC-001**: 同一条音色能被至少两条出片任务引用
- **SC-002**: 刷新页面后音色列表仍在
- **SC-003**: 浏览器能完成：保存音色 → 看到列表 → 点选

## Assumptions

- 通道若暂无音色克隆模型，先把录音存成可复用音色并照常生成口播；模型到位后同一 `voiceId` 接入克隆
- UI 对照 剪映/CapCut 音色库：列表点选，而不是每次重新上传
