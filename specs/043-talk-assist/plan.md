# Implementation Plan: 口播页左侧助手对话

**Branch**: `feature/043-talk-assist` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

## Summary

口播详情用现有 `.layout` / `.rail` 做左栏助手。对话走 Flow `chat/completions`，模型 `TALK_CHAT_MODEL` 默认 `deepseek-chat`。system 注入本条口播摘要 + 完整字幕目录。C 端写「助手」，不写厂商名。

## Technical Context

- UI 对照：首页左栏 `.rail`；对话节奏对照常见侧栏助手（ChatGPT 侧栏密度），不做独立落地页
- 缺口：口播详情现为 `.talkOnly` 单栏

## Constitution Check

- Spec-driven：本 feature 有 spec/plan/tasks
- C 端无厂商名
- 密钥仅服务端
- 三层测试：单测 + 接口 + 浏览器

## Project Structure

```
src/lib/talk-assist.ts          # system prompt、目录序列化、mock、抽推荐名
src/lib/flow/config.ts          # getTalkChatModel
src/lib/flow/chat.ts            # 支持多轮 messages
src/app/api/projects/[id]/assist/route.ts
src/app/talk-assist.tsx         # 左栏 UI
src/app/talks/[id]/page.tsx     # layout + rail + stage
```

## Complexity Tracking

| Decision | Why |
|----------|-----|
| 非流式 JSON 先落地 | 先保证推荐可用；流式可后续加 |
| 推荐点选走现有 `/captions` | 不另写应用逻辑 |
