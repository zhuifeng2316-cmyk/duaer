# Feature Specification: 在线录音克隆音色

**Feature Branch**: `feature/008-voice-record`

**Created**: 2026-09-09

**Status**: Active

**Input**: 克隆音色只能在页面里对着麦克风说，不能上传音频文件。录够时长、起名、存成可复用音色，出片时点选。禁止视频模型出片，禁止对嘴型。C 端不写厂商名。

## User Scenarios & Testing

### User Story 1 - 在线录一段再存 (P1)

作者点「开始录音」，对着麦克风说至少 10 秒，停录后可试听，起名存成音色。首页没有上传音频入口。

**Why this priority**: 上传文件会让音色来源不可控；在线录才是克隆本人说话。

**Independent Test**: 首页能看到开始录音，看不到「上传说话录音」；未录音不能保存。

**Acceptance Scenarios**:

1. **Given** 尚未录音，**When** 点存成音色，**Then** 拒绝
2. **Given** 录音不足 10 秒，**When** 停录，**Then** 不保存这段，并提示至少说 10 秒
3. **Given** 已录满 10 秒并可试听，**When** 存成音色，**Then** 列表出现该音色
4. **Given** 浏览器拒绝麦克风，**When** 开始录音，**Then** 中文说明打不开麦克风

### User Story 2 - 出片只点选已存音色 (P1)

出片不再附带音频文件。要先在线录并保存，再点选。

**Acceptance Scenarios**:

1. **Given** 出片请求带了 `voice` 文件，**When** 创建项目，**Then** 拒绝并提示先在线录音保存再点选
2. **Given** 已点选一条音色，**When** 出片，**Then** 项目只带 `voiceId`

## Requirements

- **FR-001**: C 端 MUST 用麦克风在线录音创建音色；禁止文件选择/拖拽上传音频
- **FR-002**: 录音 MUST ≥ 10 秒才可进入待保存；停录后可试听、可重录
- **FR-003**: `POST /api/voices` 仍收录音数据（浏览器录下的 webm/ogg/mp4/wav）；无录音拒绝，文案说「先录」不说「上传」
- **FR-004**: `POST /api/projects` MUST NOT 接收 `voice` 文件；只用已保存 `voiceId`
- **FR-005**: C 端只说「在线录音」「克隆音色」，不写厂商名

## Success Criteria

- **SC-001**: 首页无音频文件上传控件
- **SC-002**: 同一条在线录的音色可被出片点选
- **SC-003**: 浏览器能看到开始录音 / 停录，且没有「上传说话录音」

## Assumptions

- UI 对照 剪映/CapCut「录制我的音色」，不是网盘导入
- 通道若暂无克隆模型，仍把这段录音存成可复用音色并照常生成口播
