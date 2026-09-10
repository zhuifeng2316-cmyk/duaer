# Plan: 静帧按电影海报出图，字必须够大

**Branch**: `feature/019-registry-compose` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

## Approach

1. 出图提示从「画面上不要字」改成电影海报：有屏幕字就画巨大标题；身份包/组件镜仍不要字。
2. 出完人物静帧后给该镜打 `letteringInStill`。合成时不再叠第二层海报标题，口播字幕仍要，也不把图压暗。
3. 还要走合成字层时，字号地板提高到信息流大字；按约 8 个汉字一行定字号，flex 换行，禁止整句压扁。
4. 分镜系统提示：人物底按海报构图让出标题位。屏幕字仍由出图写入，不改已定文案。

## Mobbin（UI 必填）

- 参考产品 / 模式：电影海报构图（人物让出大标题）+ 剪映图文成片的信息流大字，不是底部小字幕条
- 无新页面；C 端流程不变

## Env / Dependencies

无新密钥。克隆静帧仍走方舟出图。

## Test Plan

- Unit: `cloneImagePrompt` 海报字 / 不要字；`planShotLettering` 已画字不叠层；`cinemaTypeScale` 地板；合成稿不压暗已画字的静帧
- API: 现有出图/成片接口仍过（mock 不打 `letteringInStill`，字层仍在）
- Browser: 无新页面。字在成片 HTML / 出图提示里，不改工作台点击流
