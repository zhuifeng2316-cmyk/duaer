# Feature Specification: 八角方位挂在人物下并可重做

**Feature Branch**: `feature/007-character-views`

**Created**: 2026-09-09

**Status**: Active

**Input**: 八个方位必须收在对应人物形象下面，而不是只留在一次性抠图任务里。点开单个形象能看到这八张，并能重做其中一张或先补齐八张。出片锁脸仍只用原头像/原照。禁止视频模型出片，禁止对嘴型。C 端不写厂商名。

## User Scenarios & Testing

### User Story 1 - 八角收在这个人下面 (P1)

存成人物时，已出的八个方位一并复制进该人物目录，并写入本地库。刷新后点这个人，墙上是这个人的八张，不是别的任务。

**Why this priority**: 形象和方位散开，下次只能重拆，作者会以为没保存。

**Independent Test**: 存人物（已有八角）→ 人物详情 8 张都能打开；库里 views 指向该人物目录。

**Acceptance Scenarios**:

1. **Given** 抠图任务已出齐八个方位，**When** 存成人物，**Then** 该人物下有 8 个方位文件
2. **Given** 已保存带八角的人物，**When** 打开首页并点这个人，**Then** 墙上出现这个人的八宫格
3. **Given** 人物尚无八角，**When** 点这个人，**Then** 仍能打开形象，八格为空并可生成

### User Story 2 - 单个形象可重做方位 (P1)

点开一个已保存人物。八张齐了时，可对其中一张点「重做这张」。只换这一张，另外七张不动。锁脸仍用该人物原头像/原照，不用已生成的八角当参考。失败则保留上一张。

**Why this priority**: 不满意某一张不该整个人重抠。

**Independent Test**: 人物已有 8 张 → 重做正面 → 正面文件变了，右前文件字节不变。

**Acceptance Scenarios**:

1. **Given** 人物八张已齐，**When** 重做正面，**Then** 仅正面更新，其余七张路径不变
2. **Given** 正在生成或重做该人物，**When** 再点重做，**Then** 拒绝
3. **Given** 重做失败，**When** 查看，**Then** 仍是重做前那张，并中文说明
4. **Given** 人物还没有这张方位，**When** 点重做这张，**Then** 拒绝并提示先生成八个方位

### User Story 3 - 没有八角的人物可补齐 (P1)

以前只存了头像的人物，点开后可「生成八个方位」。生成挂在这个人下面，不另开一条人物。

**Acceptance Scenarios**:

1. **Given** 人物有头像但方位不足 8，**When** 生成八个方位，**Then** 缺的朝向补上，已有的不动
2. **Given** 八张已齐，**When** 再点生成八个方位，**Then** 拒绝
3. **Given** 人物没有头像，**When** 生成方位，**Then** 拒绝

## Requirements

- **FR-001**: 存成人物时 MUST 把当时已有的八角文件复制到 `storage/characters/{id}/views/`，元数据写入该人物记录
- **FR-002**: `GET /api/characters/{id}` MUST 返回该人物的八个朝向（有则带图，无则空位）
- **FR-003**: 首页点选一个已保存人物 MUST 能在分镜墙查看该人物的八宫格（有出片任务进行中则仍看出片墙）
- **FR-004**: `POST /api/characters/{id}/regen` `{ viewId }` 只重做该朝向；参考图 MUST 是该人物原裁切/原照；禁止用已生成八角当参考；失败保留上一张
- **FR-005**: `POST /api/characters/{id}/expand` 只补缺失朝向，已有的不动；八张齐了则拒绝
- **FR-006**: 生成/重做期间该人物 status 为 expanding / rerunning，完成后 ready；C 端说「八个方位」「重做这张」，不说电影画面、不写厂商名、不提数据库
- **FR-007**: mock 模式可用占位图；出片锁脸规则不变（仍不用八角当参考）

### Key Entities

- **Character.views[]**: id、label、file、version；文件在人物目录下
- **Character.status**: ready / expanding / rerunning

## Success Criteria

- **SC-001**: 带八角保存后，不依赖原抠图任务也能看到八张
- **SC-002**: 单张重做不改另外七张
- **SC-003**: 浏览器能点开已保存人物看到方位墙，无八角时可生成

## Assumptions

- UI 仍在首页，对照 Apple Photos 点开某个人看照片 + 剪映素材预览，不新开后台页
- 八个方位仍是人物形象包，不是成片图片分镜
