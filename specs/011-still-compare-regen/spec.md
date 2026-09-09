# Feature Specification: 分镜画面对照文字并可单张重做

**Feature Branch**: `feature/011-still-compare-regen`

**Created**: 2026-09-09

**Status**: Active

**Input**: 分镜静图出来后，每张图下面必须展示对应的图片分镜文字（场景/构图描述），方便对照。某一镜画面不对，可以只重做这一张。C 端不写厂商名。禁止视频模型出片，禁止对嘴型。

## User Scenarios & Testing

### User Story 1 - 图下文对照 (P1)

出图完成后，分镜墙上每张静图下方能看到这一镜的文字分镜，用来对照画面是否跟描述一致。

**Why this priority**: 没有文字，作者无法判断这张图是不是这一镜。

**Independent Test**: 有静图的项目，每张图的说明里含 imagePrompt 或 scene。

**Acceptance Scenarios**:

1. **Given** 分镜画面已出齐，**When** 看分镜墙，**Then** 每张图下有该镜的场景/构图文字
2. **Given** 某一镜有 imagePrompt，**When** 展示，**Then** 优先显示 imagePrompt，而不是只显示短场景名

### User Story 2 - 单张重做 (P1)

作者点某一镜的「重做这张」。系统按已确认的文字分镜只重画这一张，其它镜不动。

**Why this priority**: 整墙重出太慢；对照后只改不对的那一张。

**Independent Test**: mock 重做镜 1 后仍只有该镜文件更新，其它 stills 路径不变。

**Acceptance Scenarios**:

1. **Given** 画面待确认且该镜已有图，**When** 重做这张，**Then** 只替换这一张静图
2. **Given** 该镜还没有图，**When** 重做，**Then** 拒绝
3. **Given** 正在出图或正在重做，**When** 再点重做，**Then** 拒绝

### User Story 3 - 确认画面后再往下 (P1)

全部静图出齐后停住。作者对照、可重做，点确认后才生成口播并继续成片。

**Acceptance Scenarios**:

1. **Given** 分镜画面已出齐，**When** 未确认画面，**Then** 不生成口播、不成片
2. **Given** 画面待确认，**When** 确认画面，**Then** 才进入口播和后续成片

## Requirements

- **FR-001**: 分镜静图下方 MUST 展示该镜文字分镜（优先 imagePrompt，其次 scene），C 端不写厂商名
- **FR-002**: 静图出齐后 MUST 停在待确认；未确认不得进入口播
- **FR-003**: `POST /api/projects/{id}/regen` `{ shotIndex }` 只重做该镜静图，使用已确认的 imagePrompt/scene
- **FR-004**: 重做后其它镜 MUST 保持不变；新图 URL 须能避开旧缓存
- **FR-005**: `POST /api/projects/{id}/confirm` 在画面待确认且静图出齐时，才继续口播成片
- **FR-006**: 成片后仍可重做某一镜；重做完成后按现有静图重新合成该成片

## Success Criteria

- **SC-001**: 浏览器能在每张分镜图下看到对应文字描述和「重做这张」
- **SC-002**: 重做一张不会清掉其它静图
- **SC-003**: 不确认画面就不会出现成片

## Assumptions

- 重做仍走现有出图通道与人物参考图，C 端不提模型名
- UI 对照剪映图文成片：图下文案，单条可替换素材
