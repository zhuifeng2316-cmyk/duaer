# Tasks: 口播页左侧助手对话

- [x] T1 `getTalkChatModel` 默认 `deepseek-chat`；`.env.example` 注明；C 端不写模型名
- [x] T2 `talk-assist.ts`：字幕目录进 prompt、多轮调用、mock、从回复抽目录中文名
- [x] T3 `flowChat` 支持 `messages` 多轮
- [x] T4 `POST /api/projects/[id]/assist`
- [x] T5 口播详情左栏助手 UI；推荐名可「用到全片」
- [x] T6 单测 + 接口测 + 浏览器问「有哪些字幕推荐」
- [x] T7 组件目录进 prompt；回复抽组件中文名；左右预览卡
- [x] T8 `POST /api/projects/[id]/assist-graphic` 用到这一镜 / 各镜
- [x] T9 单测 + 接口测组件推荐与应用
- [x] T10 题材精选 + 全库组件目录进 prompt；单测锁定约四百个中文名
- [x] T11 浏览器：口播详情问组件推荐 → 预览卡 →「用到这一镜」落到分镜
- [x] T12 组件预览按轮播变体（圆/环绕/路径/字圆/视野/屏流）分族动效
