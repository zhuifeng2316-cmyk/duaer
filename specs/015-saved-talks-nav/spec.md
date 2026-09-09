# Feature Specification: 口播保存与回看

**Feature Branch**: `feature/015-saved-talks-nav`

**Created**: 2026-09-09

**Status**: Active

**Input**: 用户生成的口播刷新后还在；顶部能进「我的口播」，点进去看到这条的进度、确认步骤和成片。C 端不写厂商名，不写「项目/数据库」。

## User Scenarios & Testing

### User Story 1 - 刷新还在 (P1)

开始做一条口播后，刷新浏览器或关掉再打开，这条还在，进度接着显示，不是空白首页。

**Why this priority**: 出片要等，刷新丢了等于没做。

**Independent Test**: 创建后 `GET` 列表能看到；用 id 再取详情，进度/状态与落盘一致。

**Acceptance Scenarios**:

1. **Given** 已点「先写文案」生成一条，**When** 刷新，**Then** 从「我的口播」仍能点进这条
2. **Given** 这条还在写或待确认，**When** 进入详情，**Then** 看到当前进度文案，可继续确认

### User Story 2 - 顶部点进去 (P1)

顶部有「做口播」「我的口播」。列表展示每条口播的标题（要讲什么）、状态/进度；点进去是这条的工作台（进度条、文案/分镜/画面确认、成片）。

**Why this priority**: 用户明确要导航点进去看进度。

**Independent Test**: 浏览器从首页点「我的口播」看到列表；点一条进入详情见进度。

**Acceptance Scenarios**:

1. **Given** 在首页，**When** 点顶部「我的口播」，**Then** 看到已生成的口播列表
2. **Given** 列表里有一条进行中，**When** 点进去，**Then** 看到进度百分比和当前步骤
3. **Given** C 端，**When** 阅读导航和列表，**Then** 不出现厂商名、不说数据库

## Requirements

- **FR-001**: 口播 MUST 落盘；`GET /api/projects` MUST 返回本机已有口播列表（新的在前）
- **FR-002**: 顶部导航 MUST 有「做口播」（首页）和「我的口播」（列表）
- **FR-003**: 「我的口播」MUST 能点进 `/talks/{id}` 看该条进度、确认步骤、成片
- **FR-004**: 新建口播后 MUST 进入该条工作台，刷新该地址仍能看见
- **FR-005**: 列表与详情 C 端称「口播」，禁止厂商名

## Success Criteria

- **SC-001**: 创建后列表接口含该 id；刷新详情仍返回同一条
- **SC-002**: 浏览器能从顶部进列表再进详情看到进度
- **SC-003**: C 端无厂商名

## Assumptions

- 口播已按条落在 `storage/projects/`，缺的是列表和详情路由
- 未装 Mobbin；对照剪映草稿箱 / CapCut 项目列表
