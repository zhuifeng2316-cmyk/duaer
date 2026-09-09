# Feature Specification: 合成稿按时间轴框架契约出片

**Feature Branch**: `feature/016-hyperframes-native-compose`

**Created**: 2026-09-09

**Status**: Active

**Input**: 电影合成稿必须按该 HTML 时间轴框架的契约来写（暂停时间轴、词级字幕组件、静帧运动写在时间轴上、胶片写在静帧调色载荷里）。禁止自创 CSS 关键帧字幕层、禁止无时间轴的自制颗粒遮罩。C 端不写厂商名。

## User Scenarios & Testing

### User Story 1 - 字幕是框架的词级高亮 (P1)

口播成片上的字，按口播原文拆成词/字，用官方高亮字幕组件的结构（词组、当前词扫过），落在下部字幕带，而不是自制的整句大字。

**Why this priority**: 用户明确要求全部用该框架的风格和要求，不要自创。

**Independent Test**: 兜底合成稿含词级字幕节点与暂停时间轴注册；校验拒绝自制 `@keyframes` 字幕 / `data-no-timeline` 无时间轴稿。

**Acceptance Scenarios**:

1. **Given** 剪辑表已齐，**When** 写合成稿，**Then** 字幕来自口播句（无口播则用屏幕字），词级高亮，下部字幕带
2. **Given** 模型稿自创 CSS 运动或无时间轴，**When** 校验，**Then** 改用内置契约模版
3. **Given** C 端，**When** 看进度，**Then** 仍是「写合成稿」，无厂商名

### User Story 2 - 静帧运动与胶片走框架写法 (P1)

每镜静帧由时间轴做推拉移砸切；颗粒/暗角写在静帧调色载荷，不另做自制遮罩层。

## Requirements

- **FR-001**: 合成稿 MUST 注册一份暂停时间轴，键名等于根节点 `data-composition-id`；禁止用「无时间轴」根属性代替
- **FR-002**: 字幕 MUST 用词级高亮组件结构（词组 + 词节点 + 时间轴显隐），字幕带允许占用下部 caption zone
- **FR-003**: 静帧运动 MUST 写在时间轴上（scale / xPercent），禁止用自制 Ken Burns `@keyframes` 驱动 clip
- **FR-004**: 胶片颗粒与暗角 MUST 写在静帧 `data-color-grading`；口播/配乐 `<audio>` MUST 有 id 与音量
- **FR-005**: 仅允许框架文档里的 GSAP 与字体 CDN；其它 http(s) 仍禁止
- **FR-006**: C 端不写厂商名

## Success Criteria

- **SC-001**: 兜底稿单测含暂停时间轴、词级字幕、调色载荷；不含无时间轴根属性、不含自制 ken-push 关键帧
- **SC-002**: mock 仍能出片；真渲仍优先按合成稿
- **SC-003**: C 端无厂商名

## Assumptions

- 对照该框架官方最小合成稿、GSAP 适配器、以及 `caption-highlight` 词级字幕组件（竖屏按画幅缩放）
- 未装 Mobbin；无新页面
