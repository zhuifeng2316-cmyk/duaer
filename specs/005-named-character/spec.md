# Feature Specification: 可复用人物形象

**Feature Branch**: `feature/005-named-character`

**Created**: 2026-09-09

**Status**: Active

**Input**: 抠出的头像不要永远叫「头像 1」。作者给人物起名，把头像、高清、八角电影画面收进同一条人物形象。下次出片点选即可，不必重新抠。禁止视频模型出片，禁止对嘴型。C 端不写厂商名。

## User Scenarios & Testing

### User Story 1 - 给这个人起名 (P1)

抠出头像后，作者可以给每个人起名字。名字出现在预览和大图上，替换默认的「头像 1」。

**Why this priority**: 不命名就无法把形象收成可复用的人。

**Independent Test**: 待确认时改名，刷新或再拉任务仍是新名字。

**Acceptance Scenarios**:

1. **Given** 已抠出头像且待确认，**When** 给某人起名「阿宁」，**Then** 该头像标签变为「阿宁」
2. **Given** 名字为空，**When** 保存名字，**Then** 仍用原来的默认名（如「头像 1」）
3. **Given** 名字超过 16 字，**When** 保存，**Then** 截到 16 字

### User Story 2 - 把形象收在一起 (P1)

作者点「存成人物」。系统把这个人的原头像、高清（若有）、原照（若有）、已出的八角电影画面复制进人物库，挂在这个名字下。首页能看到这条人物。

**Why this priority**: 形象散落在一次性抠图任务里，下次出片还得重来。

**Independent Test**: 存人物 → 列表出现名字和头像 → 人物目录里有头像文件；若已出八角则八角也在。

**Acceptance Scenarios**:

1. **Given** 待确认已有选中头像，**When** 存成人物，**Then** 人物库出现该名字，至少有一张头像
2. **Given** 已出完八张电影画面，**When** 存成人物，**Then** 这条人物同时收齐头像和八张画面
3. **Given** 未抠头像，**When** 存人物，**Then** 拒绝
4. **Given** 已有 12 条人物，**When** 再存，**Then** 拒绝并说明最多 12 条

### User Story 3 - 出片时点选已保存的人 (P1)

首页列出已保存人物。点选后可直接出片，不必再上传照片。仍可继续上传照片。出片锁脸只用原头像/原照，不用生成过的八角图当参考（八角只作为形象收藏）。

**Acceptance Scenarios**:

1. **Given** 人物库非空，**When** 打开首页，**Then** 能看到人物名和头像并可点选
2. **Given** 选中一条人物且未再传照片，**When** 提交出片，**Then** 项目带上该人物的头像参考
3. **Given** 传入不存在的人物 id，**When** 创建项目，**Then** 拒绝
4. **Given** 既没照片也没选人物，**When** 出片，**Then** 拒绝并提示先有人物参考

## Requirements

- **FR-001**: 待确认（及之后仍能看到该头像时）MUST 能给每张头像命名；1–16 字；空白则保留原标签
- **FR-002**: `POST /api/turns/{id}/rename` 写入 `faces[].label`；非法 id 拒绝
- **FR-003**: MUST 能把选中的一张头像存进人物库：名字、原裁切、高清（若有）、原照（若有）、已生成的八角画面（若有）
- **FR-004**: 人物库最多 12 条；超出拒绝
- **FR-005**: `GET /api/characters` 返回已保存人物列表（id、name、头像、是否有八角）
- **FR-006**: `POST /api/characters` 从当前抠图任务保存人物；未命名则用「人物」
- **FR-007**: 出片 `POST /api/projects` 可带 `characterIds` 复用已保存人物的**原头像/原照**；禁止把生成的八角画面当作出片锁脸参考
- **FR-008**: 无照片且无人物时拒绝出片
- **FR-009**: C 端只说「人物」「形象」，不写厂商名
- **FR-010**: 保存人物不打断当前抠图/出八角流程

### Key Entities

- **Character**: id、name、crop、head、source、views[]、enhanced、createdAt
- **TurnFace.label**: 作者起的名字
- **Project.photos**: 出片参考仍是原图像素（来自上传或人物库头像/原照）

## Success Criteria

- **SC-001**: 同一条人物能被至少两条出片任务引用
- **SC-002**: 刷新页面后人物列表仍在，名字仍在
- **SC-003**: 浏览器能完成：看到命名框 → 存成人物后列表出现名字

## Assumptions

- UI 对照 Apple Photos「人物」相册（按人收图）+ 剪映素材库点选，不新开独立后台页
- 出片锁脸仍只用原图/抠头，八角电影画面是收藏的形象，不是下一轮参考图
