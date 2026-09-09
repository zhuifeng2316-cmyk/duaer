# Duaer

人不出镜的 AI 口播。照片克隆画面，声音克隆口播，文案、分镜、配乐都来自 AI，再 ffmpeg 切图合成。

线上：https://www.duaer.com

```bash
cp .env.example .env.local
# 填入 FLOW_API_KEY
npm install
npm run dev -- -H 127.0.0.1 -p 3002
```

需要本机 `ffmpeg`。视频模型出片不做。
