# Plan: HTML 合成稿成片

**Feature**: `004-ark-html-compose`

## Architecture

出片顺序：

```
照片 + 克隆音色 + 口播意图 + 画幅
        ↓
     1. 口播文案
        ↓
     2. 图片分镜
        ↓
     3. 按镜克隆静图（火山方舟图片生成 + 参考图）
        ↓
     4. 口播音频
        ↓
     5. 配乐
        ↓
     6. 大模型写 HTML 合成稿（失败用电影模版）
        ↓
     7. 按合成稿时间轴 ffmpeg 静图运动 + 混音
```

头像高清不走出图模型。八张电影画面与项目分镜静帧共用 `generateStillFromRef`。

## UI 对照（Mobbin 未连接）

| 模式 | 对照 | 用法 |
|---|---|---|
| 出片进度 | 剪映图文成片：一条进度说到当前步骤 | 增加「在写合成稿…」，不展示源码 |
| 画幅 | CapCut 9:16 / 1:1 / 16:9 | 合成稿 `data-width/height` 与选择一致 |

本 feature 不新增大块界面。

## Tech

- 出图：`POST {ARK_API_BASE}/api/v3/images/generations`，Bearer `ARK_API_KEY`，`ARK_IMAGE_MODEL`，`image` 为参考图 data URL（一张字符串、多张数组），`watermark: false`
- 合成稿：`flowChat` + `SCRIPT_MODEL`；校验相对路径与镜数；失败 `fallbackCinemaHtml`
- 成片：解析 HTML 的 `data-motion` / 时长，复用现有 `makeStillClip` + `assembleFinal`
- 不引入视频模型；HTML 是合成源，运动仍由 ffmpeg 执行

## Env

```
ARK_API_KEY=
ARK_API_BASE=https://ark.cn-beijing.volces.com
ARK_IMAGE_MODEL=doubao-seedream-4-5-251128
FLOW_API_KEY=
FLOW_API_BASE=https://flow.dianwu.ai
SCRIPT_MODEL=gpt-6-astra
FLOW_MOCK=1     # 测试
```

C 端禁止出现上述名称。密钥禁止入库、禁止打印。
