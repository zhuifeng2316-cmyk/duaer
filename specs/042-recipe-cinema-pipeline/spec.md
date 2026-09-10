# Feature Specification: 配方组件主流程大片验收

**Feature Branch**: `feature/019-registry-compose`

**Created**: 2026-09-10

**Status**: Active

**Input**: 自建库近 400 项不能逐个出片。产品真正会用的是三种题材配方里的常见中文动作（约 29 个）+ 口播字五大家族 + 可选电影字皮肤。要按主流程验收：分镜 → 编译导演 → 合成稿 → 能渲成片，并核对像电影大片、不叠字、C 端无厂商名。

## Scope

### In scope（必须验收）

1. **故事口播** 10 个动作：砸字、杂志字、字重切换、手写标题、划重点、打字机、标题卡、故障字、漏光、闪白
2. **知识口播** 9 个动作：流程图、手绘流程、图表、数字跳动、划重点、砸字、代码演示、打勾清单、手写标题
3. **产品口播** 10 个动作：下拉刷新、通知堆、通知弹出、轮播、产品展示、大光标、界面放大、聊天对话、路径游走、分享面板
4. **成片字层家族**（自动路径）：砸字、杂志字、擦字、字重切换、划重点；长句拆短屏
5. **字幕样式抽样**：全片霓虹字、单镜砸字覆盖、一种电影字（粉笔字）进合成稿并可再出片
6. **主路径冒烟**：每题材至少 1 条从确认文案到成片（可复用已有 ready 口播 + 强制重写稿/再出片）

### Out of scope（本 feature 不做）

- 整库 398 项逐个渲 MP4（033 已单测挂载/色板/中文皮）
- 特效字 24 + 气质条 13（041 T9 另开）
- 4K 全量（只抽 1 条确认画幅契约）
- 封面 10 模版逐个出图（只抽 2 个模版）

## User Scenarios & Testing

### User Story 1 - 配方动作能挂上且像大片 (P1)

分镜写配方里的中文动作后，导演编译能对上自建库组件；合成稿挂载带电影色板；有字组件不叠第二层口播字；空字幕组件不挂演示稿。

**Independent Test**: 矩阵单测：每个配方 label → wraps；`fallbackCinemaHtml` + `validateCinemaHtml`；有字组件 `graphicHoldsLettering`。

### User Story 2 - 按主流程能出片 (P1)

三条代表口播（故事/知识/产品）确认分镜后：出图（或复用静帧）→ 口播 → 配乐 → 合成稿 → HyperFrames/回退渲 MP4 → 封面。失败可重试，不得卡在 cover。

**Independent Test**: 浏览器或脚本对已有 ready 口播 `rewriteCinemaHtml` + `writeAndRenderCinema`；状态回到 ready/done。

### User Story 3 - 成片字层抽检 (P1)

故事片：砸 / 擦短屏 / 划重点至少各一镜抽帧可见。杂志字、字重切换至少各有一条成片或合成稿时间轴可验证。强制字幕皮肤进稿后词级层带 skin。

**Independent Test**: ffmpeg 抽帧或合成稿 JSON 词组；字幕 API 写样式后稿内含 skin class。

### User Story 4 - 竖屏知识图表不崩 (P1)

竖屏知识口播写「图表」时，编译改成划重点叠人，仍出片，不挂横版报表撑破竖屏。

**Independent Test**: `compileDirector` 竖屏 knowledge + 图表 → intent 划重点；已有「为什么一到晚上就想乱花钱」可复测。

## Requirements

- **FR-001**: MUST 有配方动作矩阵（三题材全部 boardIntents），每项锁定 wraps、host/透叠、lettering 规则
- **FR-002**: 每个配方动作 MUST 能生成通过 `validateCinemaHtml` 的合成稿（可用 mock 静帧/口播）
- **FR-003**: 宿主组件 MUST 可无人物底出片；透叠 MUST 叠在人物底上
- **FR-004**: 组件自带字时 MUST 不再叠海报/口播词；空字幕组件 MUST 不挂
- **FR-005**: 每题材 MUST 至少一条端到端成片（可复用库内口播 + 再出片）
- **FR-006**: 成片字层五家族 MUST 有合成稿或 MP4 证据；长句拆短屏 MUST 保留
- **FR-007**: C 端与合成可见文案 MUST 无厂商/英文演示稿
- **FR-008**: 验收脚本/任务结果 MUST 写入本 feature 的 checklist，不合格记洞并修或开后续任务
- **FR-009**: 官方 `storage/hyperframes-registry` MUST 只读

## Success Criteria

- **SC-001**: 29 个配方动作矩阵单测全绿
- **SC-002**: 三题材各 ≥1 条 ready 成片，phase=done
- **SC-003**: 五字层家族有抽帧或时间轴证据；字幕皮肤抽样进稿
- **SC-004**: 竖屏图表→划重点回归通过
- **SC-005**: 验收清单无「未测」的配方动作

## Assumptions

- 整库挂载/色板已由 033 覆盖；本 feature 聚焦「会进分镜的常见动作」与「真出片」
- 产品/知识宿主槽位图可用已有 graphics 或占位，不强制每槽重出图
- 对照剪映图文成片气质；未装 Mobbin
