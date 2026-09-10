# Feature Specification: 成片字幕不得重叠

**Feature Branch**: `feature/019-registry-compose`

**Created**: 2026-09-10

**Status**: Active

**Input**: 成片里海报标题、口播词、字幕组件会叠在同一区域。同一时刻只保一层字。

## User Scenarios & Testing

### User Story 1 - 一镜一层字 (P1)

有砸字/杂志字等字幕组件、且组件已写进本镜中文时，不再另挂海报和口播词。写不进则不挂官方演示稿，仍用本镜口播词。全屏砸字时不挂海报。屏幕字和口播差不多时只保留口播词。

**Independent Test**: 单测锁定砸字镜无海报；能填字的字幕组件镜无口播词层；填不进的字幕组件不出现在合成稿里。

### User Story 2 - 字与字不抢时间 (P1)

砸字一词退下再出下一词。换镜前上一层字先隐掉。

**Independent Test**: 词的 end 不大于下一词 start；不跨进下一镜。

## Requirements

- **FR-001**: 同一镜 MUST 只保留一层成片字（海报或口播身份或字幕组件）
- **FR-002**: 海报不得落在下部口播带或右上通知区
- **FR-003**: 词级字幕 MUST 一词退下再出下一词，换镜前隐掉
- **FR-004**: C 端不写厂商名
- **FR-005**: 字幕组件 MUST 显示本镜屏幕字或口播。不能填字时 MUST 不挂该组件，改用本镜字层

## Success Criteria

- **SC-001**: 单测覆盖无叠层、无跨词时间
- **SC-002**: 合成稿砸字镜不含该镜海报节点
