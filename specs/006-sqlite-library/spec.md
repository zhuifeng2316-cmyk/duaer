# Feature Specification: 本地 SQLite 保存人物与音色

**Feature Branch**: `feature/006-sqlite-library`

**Created**: 2026-09-09

**Status**: Active

**Input**: 可复用的人物形象和克隆音色必须落在本机 SQLite 里，刷新、重启后还能点选。图片和录音文件仍落盘。出片任务的成片文件仍按项目目录存。C 端不写厂商名，不提数据库。

## User Scenarios & Testing

### User Story 1 - 存成人物后重启还在 (P1)

作者给头像起名并点「存成人物」。记录写入本地库。关掉页面再打开，人物名单和头像还在，可点选出片。

**Why this priority**: 只写一次性文件夹，重启后作者会以为没保存。

**Independent Test**: 存人物 → 再读列表含该名字；关掉库连接再读仍在。

**Acceptance Scenarios**:

1. **Given** 已抠出并命名的头像，**When** 存成人物，**Then** 本地库有这条人物，磁盘有头像文件
2. **Given** 已保存人物，**When** 重新打开首页，**Then** 仍能看到该人物名并点选
3. **Given** 以前用文件夹保存的人物，**When** 第一次打开新库，**Then** 自动收进库里，不丢

### User Story 2 - 音色同样进库 (P1)

克隆音色的名字和录音路径写入同一本地库。出片点选逻辑不变。

**Acceptance Scenarios**:

1. **Given** 保存音色，**When** 再列音色，**Then** 仍有这条并可试听
2. **Given** 旧的音色文件夹，**When** 第一次打开新库，**Then** 自动收进库里

## Requirements

- **FR-001**: 人物与音色的元数据 MUST 写入本地 SQLite（默认 `storage/duaer.sqlite`）
- **FR-002**: 头像/八角图/录音 MUST 仍落在 `storage/characters/{id}/` 与 `storage/voices/{id}/`，库里只存相对路径
- **FR-003**: 出片锁脸仍只用人物的原头像/原照路径，不用八角生成图当参考
- **FR-004**: 启动时若库中无记录、磁盘上有旧的 `character.json` / `voice.json`，MUST 迁入库一次
- **FR-005**: 上次点选的人物/音色 MUST 也进库，刷新后仍能记住
- **FR-006**: C 端禁止出现 SQLite / 数据库 / 厂商名
- **FR-007**: 测试可改库路径，互不污染本机库

## Success Criteria

- **SC-001**: 存人物后关闭再打开连接，列表仍有该名字
- **SC-002**: 浏览器刷新后人物/音色列表仍在（若本机已有保存）
- **SC-003**: 单测覆盖写入、再读、从旧 json 迁入

## Assumptions

- 本机 Node 可用内置 SQLite；图片太大不进库
- UI 仍对照剪映素材库点选，不新开数据库管理页
