# Feature Specification: 成片封面

**Feature Branch**: `feature/017-gemini-talk-cover`

**Created**: 2026-09-10

**Status**: Active

**Input**: 每条口播成片后要自动出一张漂亮封面。封面给「我的口播」列表当缩略图，也给成片播放器用。C 端不写厂商名。

## User Scenarios & Testing

### User Story 1 - 成片自带封面 (P1)

成片出来后，这条口播有一张专门的封面：大标题、电影光影、能一眼看出在讲什么。不是随便拿第一张分镜顶上。

**Why this priority**: 列表和播放器都靠封面认片。

**Independent Test**: mock 成片后 `coverPath` 有文件；卡片 `thumbUrl` 指向封面。真通道出图后封面含标题字。

**Acceptance Scenarios**:

1. **Given** 口播已渲成片，**When** 收尾，**Then** 落盘封面，列表缩略图用封面而不是第一张分镜
2. **Given** 成片页已有成片，**When** 打开播放器，**Then** 未播放前显示这张封面
3. **Given** 封面通道失败，**When** 收尾，**Then** 成片仍是成功，缩略图回退第一张分镜，可提示封面没加上

### User Story 2 - 封面跟这条片走 (P1)

封面标题来自钩子或屏幕大字，人物跟分镜静帧是同一个人，画幅跟成片一致。

**Why this priority**: 封面要能当推荐流海报，不能文不对题。

**Independent Test**: 单测封面标题截取、近景选片；封面文件来自静帧而不是重绘。

**Acceptance Scenarios**:

1. **Given** 文案有钩子，**When** 写封面，**Then** 大标题用钩子（去掉标点，不超过 12 字）
2. **Given** 已有分镜静帧，**When** 出封面，**Then** 封面人物就是这张静帧里的人（原像素），只叠标题，不重绘脸
3. **Given** C 端，**When** 看进度，**Then** 写「在做封面」，不出现厂商名

## Requirements

- **FR-001**: 成片 MP4 落盘之后 MUST 再出封面；封面失败 MUST NOT 把整单打成失败
- **FR-002**: 封面 MUST 落盘（默认 `cover.png`）；`publicTalkCard.thumbUrl` 优先封面，没有封面才用第一张分镜
- **FR-003**: 成片 `<video>` MUST 用封面作 `poster`
- **FR-004**: 封面标题 MUST 来自钩子或屏幕大字（去掉标点，不超过 12 字），叠在静帧上
- **FR-005**: 有分镜静帧时，封面人物 MUST 用静帧原像素，禁止出图模型重绘换脸。C 端与进度文案禁止厂商名
- **FR-006**: mock / 无静帧时 MUST 仍能出占位封面，列表不空

## Success Criteria

- **SC-001**: mock 走完整成片后，列表接口该条 `thumbUrl` 含 `cover`
- **SC-002**: 真出图能把封面文件写到项目目录
- **SC-003**: C 端无厂商名

## Assumptions

- 封面是静帧海报：人来自分镜，字叠上去；不再用出图模型重画人
- 未装 Mobbin；列表对照剪映草稿箱 / CapCut 项目封面
- 按时间轴再出片时重做封面
