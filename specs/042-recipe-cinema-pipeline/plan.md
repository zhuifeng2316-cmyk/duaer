# Implementation Plan: 配方组件主流程大片验收

**Feature**: `042-recipe-cinema-pipeline`

对照：剪映图文成片——组件是暗部道具，字幕一词一词亮，主路径一步出片。

## Strategy

不测整库 398。测 **配方会写进分镜的中文动作** + **真出片冒烟**。

```
配方 boardIntents (29)
    ↓ 单测矩阵：intent → wraps / host / lettering
compileDirector + buildEditList + fallbackCinemaHtml
    ↓ validateCinemaHtml + 不叠字 + 色板
代表口播再出片（故事 / 知识 / 产品）
    ↓ ffmpeg 抽帧抽检字层与组件壳
字幕皮肤抽样 → rewrite → 再出片（可选 1 条）
    ↓ checklist 收口
```

## Matrix（验收表）

| 题材 | 动作 | wraps | 挂法 | 字层期望 | 画幅注意 |
|------|------|-------|------|----------|----------|
| story | 砸字 | caption-kinetic-slam / 成片砸字 | 透叠→常改原生 slam | overlay-slam | 任意 |
| story | 杂志字 | caption-editorial-emphasis | 透叠或皮肤 | editorial 拆短屏 | 任意 |
| story | 字重切换 | caption-weight-shift | 透叠或皮肤 | weight 拆短屏 | 任意 |
| story | 手写标题 | hw-title | 透叠，须有中文 | graphic 或擦/砸 | 任意 |
| story | 划重点 | 成片划重点（列表）/ caption-highlight | 原生 highlight | overlay-highlight | 任意 |
| story | 打字机 | typewriter | 透叠须填 text | graphic | 任意 |
| story | 标题卡 | titlecard-calm | 透叠须有字；列表→划重点 | graphic / highlight | 任意 |
| story | 故障字 | caption-glitch-rgb | 空则改原生砸 | overlay-slam | 任意 |
| story | 漏光 | light-leak | 透叠特效 | 口播字另层 | 任意 |
| story | 闪白 | flash-through-white | 透叠转场 | 口播字另层 | 任意 |
| knowledge | 流程图 | flowchart-vertical | 宿主 | graphic，无人物底 | 竖优先 |
| knowledge | 手绘流程 | hw-pipeline | 宿主 | graphic | 竖/方 |
| knowledge | 图表 | data-chart | 宿主；竖屏→划重点 | landscape 才挂图 | 横 / 竖改划重点 |
| knowledge | 数字跳动 | count-up | 宿主/叠 | graphic | 横/方 |
| knowledge | 代码演示 | code-terminal-run | 宿主 | graphic | 横 |
| knowledge | 打勾清单 | marker-checklist-card | 透叠/卡 | graphic | 任意 |
| knowledge | 划重点/砸字/手写 | 同 story | — | — | 竖屏知识钩子砸 |
| product | 下拉刷新 | pull-to-refresh | 透叠叠人 | graphic | 竖/方 |
| product | 通知堆 | notification-stack | 透叠叠人 | graphic | 竖/方 |
| product | 通知弹出 | native-notification-pop | 透叠叠人 | graphic | 任意 |
| product | 轮播 | carousel-circle-1 | 宿主 | graphic，无人物底 | 横原生，竖自适应 |
| product | 产品展示 | app-showcase | 宿主 | graphic | 横，竖自适应 |
| product | 大光标 | oversized-cursor | 透叠 | 看是否占字 | 横 |
| product | 界面放大 | ui-focus-zoom | 宿主 | graphic | 横/方 |
| product | 聊天对话 | message-thread-reveal | 宿主 | graphic | 竖 |
| product | 路径游走 | offset-path-traveler | 透叠 | 看是否占字 | 横/方 |
| product | 分享面板 | share-sheet-carousel | 宿主 | graphic | 竖 |

## Reuse talks（本机已有）

| 题材 | 口播 | 用途 |
|------|------|------|
| story | `d9a2dd4e-…` 如果由我 | 砸/擦短屏/划重点已验；补杂志字或字重再出片 |
| knowledge | `d8a936bd-…` 晚上乱花钱 | 竖屏图表→划重点；砸字 |
| product | `2dec4575-…` 列表刷新+轮播+通知 | 产品宿主与透叠成片 |
| story 16:9 | `70402713-…` 人到中年 | 杂志/字重/粉笔皮肤抽样 |
| 4K 抽 | `8ece2b56-…` 人生由我 | 仅确认 4K 契约，不扩组件 |

## Layers

1. **Unit**：`recipe-cinema-matrix.test.ts` 锁 29 动作；复用 cinema-house / director-compile / html-compose
2. **Compose dry-run**：脚本对每动作 `compileDirector` → `buildEditList` → `fallbackCinemaHtml` → `validateCinemaHtml`
3. **Film**：三条题材再出片 + ffmpeg 抽关键镜中点帧
4. **Browser**：工作台打开三条；确认墙上中文标签、全片字幕抽样预览、封面选择器可开

## Risks / known holes to score

- 第三镜 `imagePrompt` 空仍写「划重点叠人」→ 重做图弱
- 静帧烤进「金革」污染封面底
- 杂志字/字重切换进 MP4 尚未实拍
- `chooseLettering` 对「划重点」intent 无列表时是否误落擦字——矩阵里断言
- C 端 video seekable 不可靠，验收以抽帧为准

## Mobbin

未装。对照剪映图文成片组件气质与字幕预览。
