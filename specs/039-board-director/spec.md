# Feature Specification: 分镜总导演

**Feature Branch**: `feature/019-registry-compose`

**Created**: 2026-09-10

**Status**: Implemented

**Input**: Astra 要当故事墙总导演：同一份配方知道出什么图、一层什么字、挂什么中文动作、语速角色、垫乐意图。不是再拆字幕/组件/skill/图片 Agent。作者仍确认文案 → 分镜 → 画面，一步交得出能发的口播。

## User Scenarios & Testing

### User Story 1 - 分镜按全片设计，不是逐镜填表 (P1)

确认文案后，写分镜的模型先定这条片的气（钩子镜、中段图解、收束、镜头往哪边走、字怎么留一层），再逐镜填图种/组法/动作。墙上能看出组法不只一种，知识竖屏中段优先划重点叠人，不默认整屏横版报表。

**Why this priority**: 四镜全字压图 + 错图表，是没有全片导演。

**Independent Test**: 知识分镜系统提示含全片节奏和「划重点叠在人身上」；竖屏「图表」编译后变成叠在人物底上的划重点或竖版流程，不挂横版 `data-chart`。

**Acceptance Scenarios**:

1. **Given** 已确认知识文案且画幅 9:16，**When** 写分镜，**Then** 中段图解不是横版收入柱状图压在正脸上
2. **Given** 不少于 4 镜，**When** 编译分镜，**Then** 组法不少于 3 种（英雄镜/字压图/对切/复用/快切）
3. **Given** C 端分镜墙，**When** 看一镜，**Then** 中文可见图种、组法、动作、字怎么出；无技能名、无英文组件名

### User Story 2 - 同一时刻一层字 (P1)

每一镜导演写清字策略：成片砸/擦、画进静帧短标题、或组件自带字。烤进图的大标题不得再在脸正中砸口播字。组件自己有字则本镜不再叠口播字。

**Why this priority**: 静帧「晚上乱买」叠成片「乱」，是两条字轨抢同一层。

**Independent Test**: 首镜字策略为成片砸时 `letteringInStill` 为假且合成不在正中再叠海报；图表/流程/划重点等自带字的组件镜 `showSpoken` 为假。

**Acceptance Scenarios**:

1. **Given** 钩子镜要砸字，**When** 出图，**Then** 静帧不把整句标题烤进画面
2. **Given** 一镜已画进短标题，**When** 合成，**Then** 口播字不得再用全屏砸字盖在标题上（可擦除/字重在下部，不得再出海报层）
3. **Given** 组件自带字，**When** 合成，**Then** 本镜不再叠口播词级字幕

### User Story 3 - 语速与垫乐跟这条片走 (P1)

文案口带上垫乐意图（夜里压着、不要欢快抢人声）。分镜口为每镜标语速角色：开口砸 / 往前推 / 收住。出片时仍用现有口播/配乐通道，不新开模型调用。作者点选的音色只定嗓音底色。

**Why this priority**: 现在语速按镜号套公式，配乐是文案随手英文词，和画面无关。

**Independent Test**: `talkSpeechStyle` 吃 `voiceRole`；知识配方垫乐提示禁止欢快 pop；编译后 `musicPrompt` 仍是英文器乐、无人声。

**Acceptance Scenarios**:

1. **Given** 钩子镜角色是开口砸，**When** 生成口播，**Then** 指令/语速按开口更狠，不是中间镜的默认套公式
2. **Given** 知识口播，**When** 写文案，**Then** 系统提示要求垫乐克制、器乐、不抢人声
3. **Given** 作者已选冷叙，**When** 出片，**Then** 仍用该音色，导演只改怎么说、垫什么乐

### User Story 4 - 不是多 Agent (P1)

字幕、组件、skill、图片、语速、配乐不新开 Agent，不新开 C 端选项。skill 仍是配方，运行时不读 SKILL.md。出图/口播/配乐/渲 MP4 仍是工人。

**Independent Test**: 仓库不新增独立 agent 运行时；C 端无「选择技能/字幕/组件工作流」；检索仍只吃中文动作。

## Requirements

- **FR-001**: 必须保持「一个导演心智、两口已有模型（文案 / 分镜）、一个编译器」。禁止为字幕、组件、skill、图片、语速、配乐各建 Agent 或 C 端工作流
- **FR-002**: `skill-recipes` MUST 扩展为导演配方：全片节奏、动作「长什么样」、字策略、语速角色、垫乐意图。运行时仍不得读 `.agents/skills`
- **FR-003**: 写分镜系统提示 MUST 先写全片再写每镜；每镜 MUST 能表达图（人物底/空镜/复用）、字策略、中文动作（可空）、组法、运动、语速角色。C 端与模型输出不得出现英文技能名、组件名
- **FR-004**: 写文案系统提示 MUST 带垫乐意图；`musicPrompt` 仍为英文器乐。编译器 MUST 去掉人声/欢快抢戏词
- **FR-005**: `applyBoard` 之后 MUST 跑导演编译器：竖屏知识「图表」不得挂横版 `data-chart`（改为划重点或竖版流程）；宿主镜不得再出人物底；字策略与 `letteringInStill` / 合成字幕互斥；≥4 镜时组法不少于 3 种；相邻镜推拉/左右对向仍同向校正
- **FR-006**: 合成稿 MUST 遵守字策略：成片砸则静帧不烤标题；画进图则禁止正中再砸；组件自带字则本镜口播词级字幕为空
- **FR-007**: `talkSpeechStyle` MUST 优先用分镜的语速角色，缺省才回退镜号公式；指令长度仍受通道限制
- **FR-008**: 出图工人仍在确认分镜之后。导演只写 `imagePrompt`/图种；单人默认不要第二个人写进描述
- **FR-009**: 作者确认顺序不变。C 端分镜墙用中文标出字策略。不做时间轴微调，不重写已锁定的合成稿来「自评」
- **FR-010**: 合成稿仍须暂停时间轴、词级字幕、`data-color-grading`

## Key Entities

- **DirectorRecipe**: 按 `visualMode` 的全片法则（图/字/动作效果/语速/垫乐）
- **ShotPlan**: 每镜角色、字策略、语速角色、组法、动作；编译后才有 overlay/block
- **DirectorCompiler**: 纯函数，把模型 JSON 改成成片引擎合法的 `Script`

## Success Criteria

- **SC-001**: 单测：竖屏知识「图表」编译后不是 `data-chart`；钩子砸字镜 `letteringInStill` 为假；组件字层镜合成 `showSpoken` 为假；4 镜组法 ≥3；语速角色改变 `speechRate`
- **SC-002**: 单测：分镜提示含全片节奏与动作效果句；文案提示含垫乐意图；提示与墙上无英文技能名
- **SC-003**: 浏览器走一条 9:16 知识口播到确认分镜：墙上有不少于两种组法、字策略中文可见、中段不是「图表」横版报表；不新开选项

## Assumptions

- 继续 `SCRIPT_MODEL`（Astra）。配乐/口播/出图通道不换
- 横版 16:9 知识口播仍允许图表宿主镜
- 不把官方 `ledger.json` / 七步 explainer 搬进产品
- 第一版不做看完成片再让模型打分的闭环
