# Tasks: 配方组件主流程大片验收

**Feature**: `042-recipe-cinema-pipeline`

- [x] T1 规格与验收矩阵（spec / plan）
- [x] T2 单测 `recipe-cinema-matrix.test.ts`：29 动作 → wraps、host、compile 后 lettering
- [x] T3 合成干跑：矩阵内每动作 `fallbackCinemaHtml` → `validateCinemaHtml`；checklist 已更新
- [x] T4 修矩阵发现的洞（划重点 lettering、有字组件与导演对齐、杂志/字重 captionStyle、漏光/闪白不烤进静帧）
- [x] T5 故事口播再出片：砸 / 擦短屏 / 划重点；全片杂志字再出片抽帧通过
- [x] T6 知识口播再出片：竖屏图表→划重点（＞并列）；砸字通过；流程图/手绘仍干跑
- [x] T7 产品口播再出片：下拉刷新 + 通知通过；轮播/产品展示已在 T11 修好
- [x] T8 字幕皮肤抽样：全片霓虹或粉笔 → rewrite → 再出片一镜抽帧；墙上预览浏览器点一次
- [x] T9 封面模版抽 2 个（标题卡锁定 + 砸大字或杂志字）做成封面，phase 回 done
- [x] T10 checklist 收口：无「未测」配方动作；不合格列修或转后续；更新 AGENTS 当前 feature
- [x] T11 修产品轮播竖屏挂载 / 产品展示电影暗部；配方外 intent 重复时不得改挂名单外组件
  - [x] 轮播：cover 铺满 + 宿主无人物底 + 槽位循环
  - [x] 产品展示暗部
  - [x] 配方外改挂门闩（重复意图复用；手势点按不挂）
