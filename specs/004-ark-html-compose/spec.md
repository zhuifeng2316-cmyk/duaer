# Feature Specification: HTML 合成稿成片

**Feature Branch**: `feature/004-ark-html-compose`

**Created**: 2026-09-09

**Status**: Active

**Input**: 配乐之后增加一步：大模型根据剪辑表生成电影大片 HTML 合成稿，再按合成稿渲成片。克隆静帧走火山方舟图片生成（密钥 `ARK_API_KEY`），文案 / 分镜 / 合成稿 / 口播 / 配乐仍走点物 Flow。禁止视频模型出片，禁止对嘴型数字人。C 端不写厂商名。

## User Scenarios & Testing

### User Story 1 - 锁脸出电影静帧 (P1)

作者上传人物照片（或抠头后确认），出片时每一镜静帧必须按参考图锁同一张脸，并落成电影大片画面。

**Why this priority**: 没有锁脸静帧，后面的 HTML 合成只是空模版。

**Independent Test**: mock 模式可落盘占位图；真实模式请求必须带参考图，失败则中文说明，不拿纯色块冒充人物。

**Acceptance Scenarios**:

1. **Given** 已有人物参考图且未开 mock，**When** 生成某一镜静帧，**Then** 出图请求走方舟图片生成接口，携带参考图（原图或抠头）和电影大片提示词
2. **Given** 出图密钥未配置，**When** 真实出图，**Then** 项目失败并提示未配置密钥（不出现厂商名）
3. **Given** 头像高清，**When** 修头，**Then** 仍只修原图像素，不走出图模型重绘脸

### User Story 2 - 先写合成稿再成片 (P1)

口播和配乐就绪后，系统用大模型写出一份带时间轴的 HTML 合成稿（画幅、每镜静帧、屏幕字、口播轨、配乐轨、运动），校验通过后再按稿合成 MP4。模型写不好则用电影模版兜底，不阻断成片。

**Why this priority**: 这是「页面化合成大片」的关键一步。

**Independent Test**: 用 mock 文案 + 占位静帧 + 无真实音频，仍写出 `compose/index.html` 并得到 `final.mp4`。

**Acceptance Scenarios**:

1. **Given** 文案、分镜静帧已齐，**When** 进入合成，**Then** 先出现「在写合成稿…」，项目中有 HTML 合成稿
2. **Given** 合成稿缺少某一镜静帧路径或画幅不对，**When** 校验，**Then** 改用兜底电影模版，仍继续合成
3. **Given** 合成完成，**When** 播放成片，**Then** 仍是静图运动 + 画外音口播 + 配乐，不是视频模型出的片

### User Story 3 - 出片顺序不变 (P1)

主路径仍是：文案 → 图片分镜 → 按镜出图 → 口播 → 配乐 → **写合成稿** → 渲成片。

**Acceptance Scenarios**:

1. **Given** 开始出片，**When** 看进度文案，**Then** 合成稿出现在配乐之后、成片之前
2. **Given** C 端界面，**When** 阅读任何提示，**Then** 不出现模型或通道厂商名

## Requirements

- **FR-001**: 克隆静帧（项目按镜出图、确认后的八张电影画面）MUST 走火山方舟 `POST {ARK_API_BASE}/api/v3/images/generations`，Bearer `ARK_API_KEY`；请求 MUST 带人物参考图；提示词仍强制同一人 + 电影大片静帧 + 闭口不当主持
- **FR-002**: 出图模型由 `ARK_IMAGE_MODEL` 配置。C 端与日志禁止打印密钥，禁止写厂商名
- **FR-003**: 头像高清仍只 ffmpeg 修原图，禁止出图模型重绘脸
- **FR-004**: 配乐完成之后、渲 MP4 之前，MUST 用文案大模型根据剪辑表生成 HTML 合成稿；合成稿 MUST 含画幅、每镜静帧相对路径、`data-start` / `data-duration`、屏幕字、口播与配乐轨（若有文件）
- **FR-005**: 合成稿校验失败 MUST 回退内置电影 HTML 模版，不得因此让项目失败
- **FR-006**: 成片仍按合成稿时间轴对静图做推/拉/移/砸切并混音；禁止把视频模型当主出片；禁止对嘴型
- **FR-007**: mock（`FLOW_MOCK=1`）不调用出图与文案通道，仍须写出合成稿并合成
- **FR-008**: C 端进度用「写合成稿」「合成视频」，不出现 HTML / 引擎 / 厂商名
- **FR-009**: 出片顺序 MUST 为：文案 → 图片分镜 → 出图 → 口播 → 配乐 → 合成稿 → 成片

### Key Entities

- **EditList**: 画幅、总时长、每镜 stillRel / start / duration / motion / onScreenText、口播与配乐相对路径与音量
- **CompositionHtml**: 落盘 `compose/index.html`
- **Project**: 增加 `htmlPath`；口播/配乐失败语义不变

## Success Criteria

- **SC-001**: mock 模式可在无密钥下写出合成稿并得到 mp4
- **SC-002**: 出图客户端单测覆盖：走方舟 `/api/v3/images/generations`、请求带参考图、中文错误不含厂商名
- **SC-003**: 合成稿校验与兜底模版单测覆盖：缺镜回退、相对路径、含口播轨
- **SC-004**: 浏览器能看到出片进度经过「写合成稿」，C 端无厂商名

## Assumptions

- 克隆静帧走方舟图片生成；文案/分镜/合成稿/口播/配乐走点物 Flow；本机有 ffmpeg
- 文案/合成稿走 `SCRIPT_MODEL`
- 未装 Mobbin；UI 对照剪映图文成片 / CapCut 比例，本 feature 不新增大块界面，只改进度文案
