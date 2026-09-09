# Plan: 口播保存与回看

**Feature**: `015-saved-talks-nav`

## Architecture

```
POST 创建口播 → 落盘 storage/projects/{id}
        ↓ 跳转
  /talks/{id} 工作台（进度、确认、成片）
        ↑
顶部「我的口播」→ /talks 列表 → 点一条进去
顶部「做口播」→ / 新建
```

## UI 对照（Mobbin 未连接）

| 模式 | 对照 | 用法 |
|---|---|---|
| 列表 | 剪映草稿箱 / CapCut 项目 | 标题=要讲什么，副文=进度/状态，可点进 |
| 详情 | 剪映图文成片进度 | 现有分镜墙与进度条搬到详情页 |
| 顶栏 | 常见创作工具顶导航 | 做口播 / 我的口播 |

## Tech

- `listProjects()` 扫盘读取 `project.json`
- `GET /api/projects` → `{ talks: TalkCard[] }`
- `SiteNav` 放 layout；`TalkWorkspace` 承接现首页右侧口播工作台
- 创建成功 `router.push(/talks/{id})`
- 单测列表；接口测创建后能列出、再取详情；浏览器走导航
