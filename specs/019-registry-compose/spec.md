# Feature Specification: 按题材选用组件合成

**Feature Branch**: `feature/019-registry-compose`

**Created**: 2026-09-10

**Status**: Active

**Input**: 口播不只讲故事，也做产品介绍和知识输出。成片仍是图库+组法一步出片，但可按题材从允许名单叠组件。C 端不写厂商名、不写组件英文名。

## User Scenarios & Testing

### User Story 1 - 题材从要讲什么里来 (P1)

作者只写要讲什么。系统把这条口播判成故事口播、产品介绍或知识输出，写分镜时用中文标出来。确认分镜时看得到题材，不用另开设置页。

**Why this priority**: 一步出片，不让作者先学组件库。

**Independent Test**: 同一套确认流；「产品」「功能」类题目判成产品介绍，「原理」「怎么」类判成知识输出，其余故事口播。

**Acceptance Scenarios**:

1. **Given** 作者写「新功能上线提醒怎么做」，**When** 文案/分镜写出，**Then** 题材是产品介绍
2. **Given** 作者写「为什么睡眠不够会胖」，**When** 文案/分镜写出，**Then** 题材是知识输出
3. **Given** 分镜确认墙，**When** 看文字，**Then** 能看到中文题材，没有英文组件名、没有厂商名

### User Story 2 - 分镜只许点允许名单 (P1)

写图片分镜时，每镜仍有图种和组法；可再写一个画面组件。组件必须来自该题材允许名单。写错或空着，就只走原来的图库组法。

**Why this priority**: 399 个不能让模型乱点，中文口播会被英文代码窗带跑。

**Independent Test**: 未知 id 被丢掉；允许名单内的留下；applyBoard 仍不改口播。

**Acceptance Scenarios**:

1. **Given** 题材是产品介绍，**When** 分镜写了通知堆，**Then** 该镜带上对应组件
2. **Given** 分镜写了不在名单里的名字，**When** 解析，**Then** 该镜没有组件，组法仍在
3. **Given** 实验室缺这个文件，**When** 合成，**Then** 仍能出片，只是不叠这个组件

### User Story 3 - 内置稿按题材嵌组件 (P1)

合成仍走内置时间轴模版。有组件的镜子：block 当竖屏里的卡片子合成，component 贴进这一镜。静帧组法、大字幕、一步出片不变。

**Why this priority**: 产品介绍和知识输出要看得出「组件在动」，但不能改成时间轴微调。

**Independent Test**: 兜底稿在带 block/overlay 时出现卡片或 overlay 节点；竖屏字号仍达标；C 端无厂商名。

**Acceptance Scenarios**:

1. **Given** 一镜有图表类 block，**When** 写合成稿，**Then** 稿里有子合成卡片，画幅仍是作者选的比例
2. **Given** 一镜有通知堆 overlay，**When** 写合成稿，**Then** 该镜有 overlay 节点
3. **Given** 工作台，**When** 看成片区，**Then** 仍是再出一次片，没有微调时间轴

## Requirements

- **FR-001**: 文案阶段 MUST 推断 `visualMode`：`story` / `product` / `knowledge`；C 端中文为故事口播 / 产品介绍 / 知识输出
- **FR-002**: 图片分镜 MAY 为每镜写 `overlay`（贴片段）或 `block`（子合成），且 MUST 属于该题材允许名单
- **FR-003**: 未知、错题材或不存在的组件 id MUST 丢弃，不得失败整单
- **FR-004**: 合成稿 MUST 仍是内置时间轴模版；组件文件从实验室拷进该口播 `compose/`，稿里只写相对路径
- **FR-005**: 9:16 时横屏 block MUST 以卡片嵌入，不得把成片改成横屏；018 字号规则继续有效
- **FR-006**: C 端与进度文案禁止厂商名和组件英文 id；题材与组件用中文标签
- **FR-007**: 不做时间轴微调；再出片不重写稿

## Success Criteria

- **SC-001**: 题材推断与允许名单单测覆盖三类题目和未知 id
- **SC-002**: 兜底合成稿带 block/overlay 结构，竖屏字号达标
- **SC-003**: 浏览器分镜墙能看到中文题材；成片区无微调、无厂商名
