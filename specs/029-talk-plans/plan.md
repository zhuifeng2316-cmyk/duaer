# Implementation Plan: 口播套餐与条数

**Feature**: `029-talk-plans`

对照：剪映会员中心三档卡片 + 剩余次数；CapCut Pro 定价页月/年切换；得到会员页当前权益。未装 Mobbin，按上述公开页结构，不凭空做第四种会员中心。

缺口：没有账号登录与微信/支付宝收款。本机一个工作室一份账本。开通先记账，文案写清支付随后开。

## 做法

- 账本：`src/lib/billing.ts`，kv 键 `studio_plan`
- 闸门：`POST /api/projects` 创建成功前检查、成功后扣 1 条
- 接口：`GET/POST /api/billing`（开通、加买）
- 页面：`/plans`；顶栏剩余；首页去掉「不扣次数」
- 测试：`BILLING_UNLOCK=1` 写进 vitest env；套餐单测自备 sqlite 并关掉解锁
