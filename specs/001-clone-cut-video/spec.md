# Feature Specification: 人不出镜的 AI 口播

**Feature Branch**: `feature/001-clone-cut-video`

**Created**: 2026-09-08

**Status**: Active

**Input**: 删除旧「模型直接出片」产品。新主路径是专门的口播：人不出镜；照片克隆画面；声音克隆口播；文案、分镜、配乐都来自 AI；ffmpeg 切图合成。禁止视频模型当主出片方式。

## User Scenarios & Testing

### User Story 1 - 上传素材做出镜外的口播 (P1)

作者上传 1–8 张人物照片，可选上传一段说话录音，写这条口播要讲什么，选画幅（默认 9:16），点生成。系统写出口播文案与图片分镜、按镜克隆出图、克隆口播、切图合成、配乐，给出可下载的成片。作者本人不用出镜拍摄。

**Why this priority**: 这是唯一主路径。

**Independent Test**: 用本地照片走完整流程，得到 mp4。

**Acceptance Scenarios**:

1. **Given** 未上传照片，**When** 提交，**Then** 拒绝并提示需要人物照片
2. **Given** 已上传照片与口播意图，**When** 生成完成，**Then** 每镜有一张锁脸静图 + 口播画外音 + 配乐（失败则中文说明缺哪一轨）+ 一条成片
3. **Given** 选择 1:1 或 16:9，**When** 出图与合成，**Then** 画幅与选择一致

### User Story 2 - 文案是切点 (P1)

成片按口播分镜切，屏幕上有字，节奏跟镜走，不是一张图循环，也不是对嘴型出镜。

**Acceptance Scenarios**:

1. **Given** 文案生成成功，**When** 查看项目，**Then** 能看到 hook 与每镜屏幕字、场景、时长、运动
2. **Given** 合成完成且本机 ffmpeg 支持 drawtext，**When** 播放成片，**Then** 屏幕字按镜出现

### User Story 3 - 克隆是同一人 (P1)

所有生成图必须按上传人物锁定，禁止无参考的随机脸。画面里可以出现这个人，但不要做成对镜头讲话的主持出口镜。

**Acceptance Scenarios**:

1. **Given** 已上传人物照，**When** 出图请求发出，**Then** 请求携带人物参考图，且提示词要求同一人、口播静帧而非张嘴主持
2. **Given** 出图失败，**When** 重试仍失败，**Then** 项目失败并中文说明，不拿纯色块冒充人物

## Requirements

- **FR-001**: 必须上传至少 1 张 jpg/png/webp 人物照，最多 8 张，单张 ≤ 8MB
- **FR-002**: 必须支持画幅 `9:16`（默认）、`1:1`、`16:9`
- **FR-003**: 出片 MUST 按此顺序：先确定口播文案（hook、cta、每镜 voiceover / onScreenText），再确定图片分镜（每镜 imagePrompt / scene / motion），再生成口播音频，再生成配乐，最后合成视频。镜数 MUST 由时长决定（约 3 秒一镜，3–12 镜）。口播是画外音，不是对嘴型台词。图片分镜不得改已确定的文案
- **FR-004**: 每镜必须用图像模型 + 人物参考图（抠出的头像）+ 强制电影大片静帧 + 该镜 imagePrompt 生成画面；气质栏只是加料，缺省也必须是电影光影，禁止证件照/手机自拍/网红棚拍
- **FR-005**: 必须用 ffmpeg 按镜做运动（push-in / pull-out / pan-left / pan-right / punch）并拼接
- **FR-006**: 必须生成 instrumental 配乐并混入；失败则无配乐导出并记录原因
- **FR-007**: C 端禁止展示模型/通道厂商名
- **FR-008**: 必须按镜生成口播并与画面、配乐合成；失败则无语音导出并记录原因。口播使用已保存的克隆音色（见 `002-reusable-voice`）。不做对嘴型数字人，不做视频模型出片
- **FR-009**: 线上 canonical 为 `https://www.duaer.com`
- **FR-010**: 文案每镜 MUST 含 voiceover（口播画外音）
- **FR-011**: C 端必须说清这是人不出镜的口播：图克隆、声克隆、全是 AI

### Key Entities

- **Project**: idea、aspect、photos、voiceId、script、stills、final、status
- **Script.shot**: scene、onScreenText、voiceover、durationSec、motion

## Success Criteria

- **SC-001**: 无照片无法创建项目
- **SC-002**: mock 模式可在无密钥下跑通合成（用于测试）
- **SC-003**: 浏览器能完成上传 → 生成 → 看到进度与结果区
- **SC-004**: 首页一眼能看出：口播、人不出镜、克隆画面、克隆声音

## Assumptions

- 本机有 ffmpeg
- 点物 Flow 图像接口接受 multimodal `image_url`
- 声音克隆模型若通道未开放，先收下录音并生成口播，模型到位后接入同一入口
- Mobbin 插件本环境未连接；UI 对照 剪映图文成片 / CapCut Photo video / Apple Photos Memories
