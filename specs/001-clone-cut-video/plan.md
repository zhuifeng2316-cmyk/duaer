# Plan: 人不出镜的 AI 口播

**Feature**: `001-clone-cut-video`

## Architecture

单页 Next.js App Router。项目落盘 `storage/projects/{id}/`。后台 `produce` 强制顺序：确定文案 → 确定图片分镜 → 按镜出图 → 生成口播 → 生成配乐 → ffmpeg 合成。

```
照片 + 克隆音色 + 口播意图 + 画幅
        ↓
     1. 口播文案（hook / 每镜口播 / 屏幕字）
        ↓
     2. 图片分镜（画面指令，不得改文案）
        ↓
     3. 按镜克隆静图
        ↓
     4. 生成口播音频
        ↓
     5. 生成配乐
        ↓
     6. ffmpeg 运动镜 + 拼接混音
```

人不出镜：没有实拍、没有对嘴型。画面是克隆静图，声音是克隆口播。

## UI 对照（Mobbin 未连接）

| 模式 | 对照 | 用法 |
|---|---|---|
| 上传参考后出片 | 剪映「图文成片」：素材 → 文案 → 导出 | 一屏完成，不设多步向导 |
| 画幅切换 | CapCut 导出比例 9:16 / 1:1 / 16:9 | 三个比例按钮 |
| 照片变电影 | Apple Photos Memories | 静图运动 + 音乐，不假装实拍 |

## Tech

- Next 16 App Router + Route Handlers
- Flow：chat completions（文案 + 出图）、speech、music generations
- ffmpeg：zoompan 运动、concat、amix
- Vitest：单元 + 接口；浏览器走 cursor-ide-browser

## Env

`SITE_URL` `FLOW_API_KEY` `SCRIPT_MODEL` `IMAGE_MODEL` `SPEECH_MODEL` `MUSIC_MODEL` `FLOW_MOCK=1`（测试）
