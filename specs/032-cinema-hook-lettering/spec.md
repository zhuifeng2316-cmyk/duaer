# Feature Specification: 钩子结尾进片、组件一层字、合成失败说清

**Feature Branch**: `feature/019-registry-compose`

**Created**: 2026-09-10

**Status**: Active

**Input**: 钩子和结尾只写在确认页，不成片。通知/图表上还叠口播字。图表组件内部是英文。电影合成失败会悄悄变成剪辑，用户不知道。

## User Scenarios & Testing

### User Story 1 - 钩子和结尾进成片 (P1)

确认页的前 3 秒钩子、结尾行动必须念出来，也要出现在合成稿字层。已写进第一镜/末镜口播的不重复念。

**Independent Test**: 单测 `spokenShotLine` 含钩子和结尾；兜底合成稿 JSON 含这两句。

### User Story 2 - 有字的组件不再叠口播字 (P1)

通知、图表、流程图、已填中文的字幕组件，这一镜只出组件上的字，不再挂海报和词级口播字。

**Independent Test**: 单测这些镜 `showPoster`/`showSpoken` 均为 false。

### User Story 3 - 图表流程图不露英文 (P1)

官方组件模板里的英文标题不得出现在合成目录副本。用本镜屏幕字/口播换上中文。不改官方源文件。

**Independent Test**: 单测皮肤函数去掉英文；staging 后的 compose 副本含中文、不含 Monthly Revenue / Should I learn to code。

### User Story 4 - 合成失败要说清 (P1)

优先按合成稿渲成片。失败仍用剪辑出片，但必须告诉作者「电影合成没渲上，已用剪辑出片」。C 端不写厂商名。mock / 强制关掉渲染器时不报这句。

**Independent Test**: 单测失败文案；强制关渲染器的项目无该提示。

## Requirements

- **FR-001**: 钩子、结尾 MUST 进入口播音频与合成稿字层；与该镜口播重复则跳过
- **FR-002**: 已有屏幕字的组件镜 MUST 只保留组件字层
- **FR-003**: 图表、流程图 MUST 在合成目录用本镜中文替换模板英文；不得改官方 registry 源文件
- **FR-004**: HTML 时间轴渲染失败 MUST 回退剪辑并写入 `composeError`；成功则清空
- **FR-005**: C 端不写厂商名

## Success Criteria

- **SC-001**: 单测覆盖钩子结尾、组件不叠字、中文皮肤、失败提示
- **SC-002**: 工作台能看到合成失败提示
