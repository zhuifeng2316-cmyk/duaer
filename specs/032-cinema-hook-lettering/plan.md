# Implementation Plan: 钩子结尾进片、组件一层字、合成失败说清

**Feature**: `032-cinema-hook-lettering`

对照：剪映图文成片片头大字进成片；失败会说清「已用备用导出」，不装作还是电影稿。

## Flow

口播按镜生成时，首镜补钩子、末镜补结尾（已包含则不补）
合成稿词级字幕用同一句 `spokenText`
通知/图表/流程图/已填字的字幕组件：关掉海报和口播字层
拷进 compose/ 的图表、流程图做成片皮肤（中文），官方源不动
HTML 渲失败 → `composeError`，工作台警告，仍出 mp4
