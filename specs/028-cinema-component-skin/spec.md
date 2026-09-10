# Feature Specification: 自建库组件统一电影大片气质

**Feature Branch**: `feature/019-registry-compose`

**Created**: 2026-09-10

**Status**: Active

**Input**: 过一遍自建库组件。能改气质的都改成电影大片：暗部、胶片、暖金。白底后台、薄荷绿、办公蓝不要。用户上传的槽位图不改色。

## User Scenarios & Testing

### User Story 1 - 组件看起来像大片里的道具 (P1)

下拉刷新、通知、轮播、图表、流程图等挂进成片后，壳子和系统配色都是电影大片，不是互联网后台。

**Independent Test**: 合成稿每个库内挂载带齐电影色板；白底流程图/图表加胶片滤镜。

## Requirements

- **FR-001**: 库内组件挂载 MUST 写入暗部/暖金/胶片色板（含 accent）
- **FR-002**: 颜色变量与 color 类型参数 MUST 落到这套色板
- **FR-003**: 写死白底/办公蓝的宿主组件 MUST 加胶片滤镜；用户上传槽位不加
- **FR-004**: 槽位出图提示 MUST 写电影大片，不写干净扁平

## Success Criteria

- **SC-001**: 单测锁定色板写入、流程图带滤镜、上传不加滤镜
