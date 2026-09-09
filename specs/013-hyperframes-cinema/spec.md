# Feature Specification: 电影合成稿按时间轴渲成片

**Feature Branch**: `feature/013-hyperframes-cinema`

**Created**: 2026-09-09

**Status**: Active

**Input**: 配乐之后的 HTML 合成稿必须按「出大片」来写（胶片颗粒、暗角、字幕安全区、静帧持续运动、钩子/CTA、口播+配乐混音），并真正用 HTML 时间轴渲染器渲成 MP4。渲染失败回退现有 ffmpeg 电影剪辑。禁止视频模型出片，禁止对嘴型。C 端不写厂商名。

## User Scenarios & Testing

### User Story 1 - 合成稿就是大片模版 (P1)

口播和配乐就绪后，写出的合成稿不只是静图列表：每镜有摄像机运动、胶片气质、下部字幕安全区、片头钩子和片尾行动，口播在上、配乐垫底。

**Why this priority**: 用户要的是「怎么出大片都写上」，而不是再导出一版幻灯片。

**Independent Test**: 兜底模版单测含胶片/暗角/运动/字幕安全区/口播配乐轨；缺这些则校验失败并回退该模版。

**Acceptance Scenarios**:

1. **Given** 剪辑表已齐，**When** 写合成稿，**Then** 稿内每镜静帧有时长、运动、胶片处理，字幕在下部安全区，有钩子和 CTA
2. **Given** 模型稿缺少大片要素或外链，**When** 校验，**Then** 改用内置电影模版，项目不失败
3. **Given** 成片，**When** 观看，**Then** 仍是闭口静帧在动 + 画外音，不是对嘴型、不是视频模型出的片

### User Story 2 - 按合成稿渲 MP4 (P1)

合成稿落盘后，用 HTML 时间轴渲染器（本机浏览器逐帧 + 混音）把 `compose/index.html` 渲成 `final.mp4`。本机没有渲染器或渲染失败时，沿用 ffmpeg 静图运动 + 混音，不得因此整单失败。

**Why this priority**: 大片气质（颗粒、暗角、字幕动画、Ken Burns）只在按 HTML 渲时完整成立。

**Independent Test**: mock 模式不调渲染器，仍出 `final.mp4`；真实模式优先渲染器，失败回退 ffmpeg。

**Acceptance Scenarios**:

1. **Given** 合成稿已写，**When** 合成视频，**Then** 优先按 HTML 时间轴渲 MP4
2. **Given** mock 或渲染器不可用，**When** 合成，**Then** ffmpeg 兜底仍得到可播 mp4
3. **Given** C 端进度，**When** 阅读，**Then** 仍是「写合成稿」「合成视频」，无厂商/引擎名

### User Story 3 - 出片顺序不变 (P1)

主路径仍是：文案 → 图片分镜 → 出图 → 确认画面 → 口播 → 配乐 → 写合成稿 → 渲成片。

## Requirements

- **FR-001**: 合成稿 MUST 是完整 HTML，根节点带 `data-composition-id`、画幅、时长、帧率；媒体路径相对合成目录，禁止 http(s) 外链
- **FR-002**: 合成稿 MUST 写出大片要素：每镜 `data-motion` 持续运动（不要死静帧）、胶片颗粒、暗角、字幕下安全区、钩子、CTA；口播 `data-volume` 为 1、配乐为 0.16（若有文件）
- **FR-003**: 静帧 MUST 带胶片调色载荷（压一点阴影、轻微暖调、颗粒、暗角）；禁止对嘴型、禁止画面上英文水印
- **FR-004**: 配乐之后 MUST 先写合成稿再渲 MP4；校验失败 MUST 回退内置电影模版
- **FR-005**: 真实出片 MUST 优先用 HTML 时间轴渲染器把合成稿渲成 `final.mp4`；失败或 mock MUST 回退 ffmpeg 推拉移砸切 + 混音
- **FR-006**: 媒体文件对渲染器可见：合成目录内能解析到静帧、口播、配乐（相对路径，不用 `../`）
- **FR-007**: C 端进度用「写合成稿」「合成视频」；页面与出片文案禁止厂商名
- **FR-008**: 禁止视频模型出片；渲染器只编已有静图+音频，不生成新画面、不生成口播

### Key Entities

- **CinemaHtml**: `compose/index.html`，含时间轴与大片层
- **ComposeProject**: `compose/` 为渲染根目录（静帧/音频以相对路径可达）
- **Project.finalPath**: 仍为 `final.mp4`

## Success Criteria

- **SC-001**: 兜底合成稿单测覆盖胶片、暗角、运动、字幕安全区、口播/配乐轨
- **SC-002**: mock 接口测仍能出 `final.mp4`，不依赖本机渲染器
- **SC-003**: 渲染失败不导致项目失败（走 ffmpeg 兜底）
- **SC-004**: C 端无厂商名

## Assumptions

- 克隆静帧仍走火山方舟；文案/分镜/合成稿/口播/配乐仍走点物 Flow
- HTML 时间轴渲染在本机执行，不消耗第三方成片额度
- 未装 Mobbin；无新大块 UI
