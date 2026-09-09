# Plan: 八角方位挂在人物下并可重做

**Feature**: `007-character-views`

## Architecture

八角文件和元数据都挂在人物上。抠图任务仍可先出八角再复制进来；之后预览和重做只打人物接口。

```
storage/characters/{id}/
  crop.png / head.png / source.jpg
  views/front-v1.png …
storage/duaer.sqlite  characters.views_json + status
```

出片锁脸仍走 `characterIdentityRels`（原裁切/原照），不把 `views/` 当参考。

## UI 对照（Mobbin 未连接）

| 模式 | 对照 | 用法 |
|---|---|---|
| 点开一个人 | Apple Photos 人物相册：点名字看这个人的一组照片 | 点人物 chip 打开八宫格 |
| 单张重做 | 剪映素材：替换其中一张，其余不动 | 每格「重做这张」 |
| 补齐素材 | CapCut 角色参考包补张 | 「生成八个方位」只补空位 |

有出片项目进行中时，墙仍是分镜墙，不打断出片。

## Tech

- `GET /api/characters/{id}` 详情 + 八格 URL
- `POST /api/characters/{id}/expand` 补缺失朝向
- `POST /api/characters/{id}/regen` `{ viewId }` 单张重做
- Node `node:sqlite` 增 status / progress / message / error / regen_view_id
- 出图仍走现有 `generateStillFromRef`，参考 `cinemaRefPaths(crop, source)`
- 单测：保存带八角、重做只改一张、expand 补空；接口测；浏览器点人物看墙

## Env

无新密钥。`FLOW_MOCK=1` 用占位图。
