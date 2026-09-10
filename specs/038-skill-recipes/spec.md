# Feature Specification: 技能蒸馏成生成配方

**Feature Branch**: `feature/019-registry-compose`

**Created**: 2026-09-10

**Status**: Active

**Input**: 技能手册不能当运行时提示词。写文案和分镜时要用手册里让成片好看的法则，C 端不出现技能名。

## User Scenarios & Testing

### User Story 1 - 分镜只看到精选中文动作 (P1)

知识口播写分镜时，系统只给出划重点、流程图等少数中文动作，不会把整库标签塞进提示。

**Independent Test**: 知识分镜系统提示含「划重点」「流程图」，不含上百个顿号分隔的标签。

### User Story 2 - 文案第一句能上屏 (P1)

知识文案提示要求第一句是能砸上屏的短结论，不要先下定义。

**Independent Test**: 知识文案系统提示含「能上屏」或「短结论」。

### User Story 3 - 名单外不挂组件 (P1)

分镜写了配方名单以外的动作，成片不挂组件，只出静图运动。

**Independent Test**: `planHouseGraphics` 对名单外 intent 清空 overlay/block。

### User Story 4 - 相邻镜不同向横移被校正 (P1)

一镜往左移、下一镜往右移，合成时改成同向。

**Independent Test**: `pan-left` 紧接 `pan-right` 的第二镜变成 `pan-left`。

## Requirements

- **FR-001**: 每种题材 MUST 有一份生成配方（文案节奏、精选中文动作、合成手法）。运行时不得读取 `.agents/skills` 的 SKILL.md
- **FR-002**: 写文案的系统提示 MUST 带上该题材 `copyBeats`
- **FR-003**: 写分镜的系统提示 MUST 只列出该题材 8–12 个中文动作，不得列举整库标签
- **FR-004**: 按配方检索组件时，名单外的 graphicIntent MUST 不挂组件，仍出片
- **FR-005**: 合成稿相邻镜若左右或推拉对向，MUST 改成与前一镜同向
- **FR-006**: 知识/产品首镜在没有组件字层时 MUST 用砸字钩子；字盖在画面上，静帧铺满，不把画面上推留底栏
- **FR-007**: C 端与模型输出不得出现英文技能名、组件名
- **FR-008**: 合成稿仍须暂停时间轴、词级字幕、`data-color-grading`

## Success Criteria

- **SC-001**: 单测覆盖配方提示、名单外不挂、镜间同向、合成契约
- **SC-002**: 接口知识口播确认分镜后，graphicIntent 空或属于精选名单
- **SC-003**: 浏览器走一条知识口播，确认文案后分镜墙中文动作来自精选名单
