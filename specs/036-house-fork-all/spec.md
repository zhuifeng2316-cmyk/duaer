# Feature Specification: 官方剩余组件收进自建库

**Feature Branch**: `feature/019-registry-compose`

**Created**: 2026-09-10

**Status**: Active

**Input**: 把官方实验室里还能读到的组件全部拷进自建库，改成电影色和中文名。成片只认自建库。缺文件的不入库。全库单测必须过。

## User Scenarios & Testing

### User Story 1 - 库里是全部能拷到的官方件 (P1)

下拉刷新仍在，打字机、分享面板、故障字等先前没入库的也在。官方源不改。没有文件的（如灯管描边）跳过。

**Independent Test**: `houseCatalog()` 条数等于已拷文件数，且 ≥390；中文名无连续三个英文字母；按中文名和第一条别名能检索到自己。

## Requirements

- **FR-001**: 官方实验室里存在的组件 MUST 拷进 `house/registry` 并登记进自建库
- **FR-002**: 每条 MUST 有唯一中文名、别名、题材；产品检索只打自建库
- **FR-003**: 副本 MUST 刷电影色并去掉厂商英文；官方源 MUST NOT 被改写
- **FR-004**: 缺文件 MUST 跳过仍出片；C 端不写厂商名

## Success Criteria

- **SC-001**: 全库单测过：中文名、检索、填参无厂商英文、挂载色板
