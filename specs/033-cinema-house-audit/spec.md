# Feature Specification: 自建库组件大片验收

**Feature Branch**: `feature/019-registry-compose`

**Created**: 2026-09-10

**Status**: Active

**Input**: 18 个自建库组件要逐个验收是否像电影大片。白底、薄荷绿、办公蓝、官方英文演示稿都不合格。字幕组件写不进中文就不要挂。官方源文件不改，合成目录副本换中文并加胶片滤镜。

## User Scenarios & Testing

### User Story 1 - 每个库内组件都能验收 (P1)

下拉刷新、通知、轮播、图表、流程图、产品展示、代码演示、手绘流程等，挂进成片后：电影色板、无厂商英文、有字的组件不叠口播字。白底宿主加胶片滤镜。

**Independent Test**: 单测遍历 `houseCatalog()` 全量；皮肤副本不含演示英文；官方源仍保留原文件。

## Requirements

- **FR-001**: 库内每一项 MUST 有中文名、能按中文动作检索、合成稿带电影色板
- **FR-002**: 写死英文的组件 MUST 在合成目录副本换成这一镜中文；不得改官方 registry 源文件
- **FR-003**: 白底/奶油底宿主 MUST 加胶片滤镜；字幕组件无本镜中文 MUST 不挂
- **FR-004**: 组件自己已有字时 MUST 不再叠海报和口播词
- **FR-005**: 槽位出图提示 MUST 写电影大片
- **FR-006**: C 端不写厂商名

## Success Criteria

- **SC-001**: 18 个组件全量单测锁定色板、中文皮肤、滤镜、不叠字
- **SC-002**: 官方 `storage/hyperframes-registry` 源文件不被测试改写
