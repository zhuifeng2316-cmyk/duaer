# Feature Specification: 口播页左侧助手对话

**Feature Branch**: `feature/043-talk-assist`

**Created**: 2026-09-11

**Status**: Active

**Input**: 口播详情页左侧加 AI 对话框。作者可问字幕怎么选；助手只能从本产品已有字幕目录里推荐中文名。后端用对话模型，C 端不写厂商名。

## User Scenarios & Testing

### User Story 1 - 左侧对话 (P1)

打开一条口播详情，左侧有助手栏。可打字提问、看到多轮回复。右侧仍是原工作台。

**Acceptance Scenarios**:

1. **Given** 已打开口播详情，**When** 看页面，**Then** 左侧有助手输入与消息区，右侧工作台可用
2. **Given** 发出「有哪些字幕推荐」，**When** 助手回复，**Then** 回复里的字幕名都来自本站目录中文名，不编造目录外样式

### User Story 2 - 点推荐名用到全片 (P2)

助手回复里若带出目录内中文名，可一键用到全片字幕（画面已可改字幕时）。

**Acceptance Scenarios**:

1. **Given** 助手推荐了「砸字」，且当前可改字幕，**When** 点用到全片，**Then** 全片字幕变为砸字
2. **Given** 尚不能改字幕，**When** 点推荐，**Then** 提示画面出来后再改，不写厂商名

## Requirements

- **FR-001**: 口播详情 MUST 左侧助手 + 右侧工作台
- **FR-002**: 助手 MUST 能多轮对话；后端模型默认 `deepseek-chat`（可用环境变量覆盖）；C 端禁止厂商名
- **FR-003**: 问字幕推荐时 system MUST 注入完整字幕目录（分组 + 中文名）；禁止推荐目录外样式
- **FR-004**: 回复中识别到的目录中文名 SHOULD 提供「用到全片」快捷操作（可改字幕时）
- **FR-005**: 无密钥或 mock 时 MUST 仍能本地演示推荐，不暴露密钥

## Success Criteria

- **SC-001**: 单测锁定目录进 prompt、模型名配置、mock 回复含真实中文名
- **SC-002**: 接口可对某条口播发消息并拿到回复
- **SC-003**: 浏览器左侧能问字幕推荐并看到目录内名称
