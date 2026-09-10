# Feature Specification: 按动作智能选组件一次出片

**Feature Branch**: `feature/019-registry-compose`

**Created**: 2026-09-10

**Status**: Active

**Input**: 作者只要一次确认就出满意成片。分镜写中文「这一镜画面在动什么」，系统按动作检索组件库、读取参数并填进内置合成稿。C 端不写英文组件名。

## User Scenarios & Testing

### User Story 1 - 分镜写动作，系统对上组件 (P1)

写图片分镜时每镜可写一句中文画面动作（如下拉刷新、通知弹出、砸大字）。系统用英文检索词对组件库，选中后再读该组件的变量表并填默认/从口播推断的值。模型不必知道英文 id。

**Why this priority**: 399 个不能靠模型背名字；参数在文件头里，系统读了才能一次到位。

**Independent Test**: 「下拉刷新」对上 pull-to-refresh 并带上 pullDistance/spinnerStyle；普通故事口播不会对上美国地图。

**Acceptance Scenarios**:

1. **Given** 一镜动作是下拉刷新，**When** 系统选组件，**Then** 选中下拉刷新组件并填好拉力与转圈样式
2. **Given** 故事口播没有产品手势，**When** 选组件，**Then** 不出现通知堆/下拉刷新，组法仍在
3. **Given** 分镜墙，**When** 看文字，**Then** 只见中文动作（如下拉刷新），不见英文 id

### User Story 2 - 合成稿带参数一次出片 (P1)

内置稿把选中的组件按子合成挂上，并写入变量。缺文件或对不上就跳过，仍出片。不做时间轴微调。

**Independent Test**: 兜底稿含 data-composition-src 与变量；竖屏字号达标。

## Requirements

- **FR-001**: 分镜 MAY 写 `graphicIntent`（中文动作）；系统 MUST 把它译成英文检索词并对组件库打分
- **FR-002**: 选中后 MUST 读取实验室文件里的变量声明并写入 `graphicVars`；读不到就用空对象
- **FR-003**: 模型填写的英文 id 仍受题材过滤；系统自动配对优先于模型瞎填
- **FR-004**: 合成稿 MUST 用子合成挂载并带 `data-variable-values`；缺文件跳过
- **FR-005**: C 端只显示中文动作/中文标签；一步出片，无微调

## Success Criteria

- **SC-001**: 单测锁定下拉刷新配对与变量、故事口播不误配产品手势
- **SC-002**: 合成稿单测含变量挂载；浏览器分镜墙无英文 id
