# Echo 快速开始

**当前版本**：v0.0.1  
**部署平台**：Vercel + Modal

---

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
# 访问 http://localhost:5173

# 类型检查
npm run lint

# 构建生产版本
npm run build
```

---

## 生产部署

详见 [DEPLOYMENT.md](./DEPLOYMENT.md)

**快速链接**：
- 前端部署：[Vercel](https://vercel.com)
- 后端服务：https://le0609--chinese-asr-serve.modal.run
- 完整文档：[README.md](./README.md)

---

## 环境变量

创建 `.env` 文件（参考 `.env.example`）：

```bash
VITE_ASR_ENDPOINT=https://le0609--chinese-asr-serve.modal.run
```

---

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS
- **后端**：Modal Serverless + Gradio + FunASR
- **存储**：IndexedDB（浏览器本地）

---

## 常见问题

**Q: 转写卡住不动？**  
A: 首次使用或后端休眠后需要 10-30 秒冷启动，请耐心等待。

**Q: 如何修改后端地址？**  
A: 修改 `.env` 中的 `VITE_ASR_ENDPOINT` 或在 Vercel Dashboard 设置环境变量。

**Q: 历史记录存在哪里？**  
A: IndexedDB（浏览器本地），最多 50 条，清除浏览器数据会丢失。

---

更多信息请查看完整文档。
