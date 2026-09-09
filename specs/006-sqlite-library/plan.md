# Plan: 本地 SQLite 保存人物与音色

**Feature**: `006-sqlite-library`

## Architecture

```
storage/duaer.sqlite     人物、音色、上次点选
storage/characters/{id}/ 头像、高清、原照、八角图
storage/voices/{id}/     说话录音
storage/turns|projects   出片任务仍按目录（成片文件大）
```

## UI 对照（Mobbin 未连接）

| 模式 | 对照 | 用法 |
|---|---|---|
| 素材还在 | 剪映/CapCut 素材库、Photos 人物相册 | 刷新后名单还在，不提「数据库」 |

本 feature 不改版式，只换保存位置。

## Tech

- `node:sqlite` `DatabaseSync`，服务端读写
- 表：`characters` `voices` `kv`
- 第一次 `getDb()` 建表，并把旧 json 文件夹迁入
- `DUAER_SQLITE` 覆盖测试路径

## Env

```
# 可选，测试用。默认 storage/duaer.sqlite
# DUAER_SQLITE=/tmp/duaer-test.sqlite
```
