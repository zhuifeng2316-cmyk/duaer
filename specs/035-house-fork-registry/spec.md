# Feature Specification: 自建库收编官方稿，官方目录踢出产品

**Feature Branch**: `feature/019-registry-compose`

**Created**: 2026-09-10

**Status**: Active

**Input**: 把正在用的 18 个官方组件拷进自建库，改成电影大片中文稿。成片只认这份库。官方目录不入库；以后要新动作再从官方拷过来改。

## User Scenarios & Testing

### User Story 1 - 成片只挂自建库 (P1)

分镜中文动作只打自建库 18 项。分享面板、故障字、打字机等未入库的官方件不再挂上。缺文件或对不上仍出片，只是不叠该组件。

**Independent Test**: `registryCatalog()` 长度为 18；未入库英文名 `pickGraphicForShot` 为空；合成稿不挂 `typewriter` / `transitions-other`。

### User Story 2 - 库内稿已是咱们的 (P1)

自建库 HTML 在仓库里：中文默认文案、电影色板，不读官方实验室。出片按本镜再填参数。官方 `storage/hyperframes-registry` 源文件不被改写。

**Independent Test**: 库内文件无演示英文、无薄荷绿；测试不依赖官方实验室路径。

## Requirements

- **FR-001**: 18 个自建库组件 MUST 以仓库内副本为唯一源；检索、填参、合成拷贝都走这份
- **FR-002**: 产品路径 MUST NOT 用官方目录做检索或挂载；名单外丢掉仍出片
- **FR-003**: 副本 MUST 去掉官方演示英文并刷成电影色板；官方源文件 MUST NOT 被改写
- **FR-004**: 以后要新组件时 MUST 从官方再拷一条进自建库再改，不得把官方整库加回产品
- **FR-005**: C 端不写厂商名、不写组件英文 id

## Success Criteria

- **SC-001**: 单测锁定目录=18、中文动作仍能对上、未入库官方名不挂
- **SC-002**: 自建库文件可在无官方实验室时读到；官方源英文演示仍在（若实验室存在）
