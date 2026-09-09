# Feature Specification: 成片时间轴编辑

**Feature Branch**: `feature/014-cinema-studio-edit`

**Created**: 2026-09-09

**Status**: Active

**Input**: 成片（或合成稿已落盘）之后，作者在产品里打开时间轴编辑器微调合成稿（运动、字幕、胶片、音量），再按当前稿渲 MP4。编辑器就是本机 HTML 时间轴 Studio。禁止视频模型出片，禁止对嘴型。C 端不写厂商名。

## User Scenarios & Testing

### User Story 1 - 成片后打开时间轴 (P1)

成片出来后，作者点「微调成片」，页面里打开时间轴编辑器（同一套合成稿），可改运动、字幕位置、胶片、音量。

**Why this priority**: 用户明确要求视频编辑用时间轴编辑器，而不是只能看导出的 MP4。

**Independent Test**: 有 `compose/index.html` 时接口返回可打开的编辑地址；没有合成稿则中文拒绝。

**Acceptance Scenarios**:

1. **Given** 项目已有合成稿，**When** 点微调成片，**Then** 打开该项目的时间轴编辑器
2. **Given** 还没有合成稿，**When** 请求打开，**Then** 提示还不能微调
3. **Given** C 端，**When** 阅读按钮和提示，**Then** 不出现厂商/引擎名

### User Story 2 - 按改过的时间轴再出片 (P1)

作者在时间轴里改完后，点「按时间轴再出片」。系统不得用大模型重写合成稿盖掉改动，只按磁盘上的 `compose/index.html` 再渲 `final.mp4`。

**Acceptance Scenarios**:

1. **Given** 作者改过合成稿，**When** 再出片，**Then** 不覆盖 index.html，成片按改后的稿
2. **Given** 渲染失败，**When** 再出片，**Then** 仍可 ffmpeg 兜底，项目不因此无稿可救

## Requirements

- **FR-001**: 有合成稿时首页 MUST 提供「微调成片」，打开本机时间轴编辑器；默认端口不得占用站点 3002
- **FR-002**: 编辑器加载该项目 `compose/`（index.html + 静帧/口播/配乐）
- **FR-003**: 「按时间轴再出片」MUST 复用现有合成稿再渲，禁止再跑文案大模型写稿
- **FR-004**: C 端用「微调成片」「时间轴」「按时间轴再出片」；禁止厂商名
- **FR-005**: 无合成稿 MUST 不能打开编辑器

## Success Criteria

- **SC-001**: 无稿接口 400；有稿可拿到编辑地址
- **SC-002**: 再出片不调用写合成稿
- **SC-003**: 首页成片区能打开时间轴；C 端无厂商名

## Assumptions

- 时间轴与渲片共用同一份 HTML；编辑器本机启动
- 未装 Mobbin；对照剪映图文成片：成片下方「编辑」进入时间轴
- 站点开发端口 3002，编辑器另开端口
