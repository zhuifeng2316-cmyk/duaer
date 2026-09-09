# Plan: 单人分镜默认不出现其他人

**Feature**: `012-solo-person-lock`

## Architecture

人数 = `max(1, characterIds.length)`。出图 `cloneImagePrompt` 用这个人数，而不是 `photoPaths.length`。单人且分镜未点名别人 → 独角锁。分镜点名别人或人数 ≥2 → 允许相应的其他人。

```
选 1 人 / 只上传参考照 → 分镜默认不写别人 → 出图禁止路人
选 ≥2 人                 → 分镜可同框选定的人 → 出图锁这些脸
某镜文字写了别人         → 该镜允许按描述带人
```

## UI 对照（Mobbin 未连接）

无新页面。规则落在分镜写作与出图提示，C 端不解释模型。

## Tech

- `Project.characterIds` 创建时写入
- `projectPeopleCount`、`shotAsksForOthers`
- `buildBoardSystem(count, peopleCount)`；`generateCloneStill({ peopleCount })`
- 单测覆盖独角锁、分镜点名、多角色；接口测保存 characterIds
- 无前端改动，不强制新浏览器流
