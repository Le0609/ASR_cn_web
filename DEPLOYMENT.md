# Echo 部署指南 - Vercel

本文档提供 Echo 前端应用在 Vercel 平台的完整部署流程。

---

## 📋 前置条件

- GitHub 账号
- Vercel 账号（可用 GitHub 登录，免费）
- 后端 ASR 服务已部署（Modal: `https://le0609--chinese-asr-serve.modal.run`）
- Git 已安装（可选，也可直接从 Vercel Dashboard 导入）

---

## 🚀 部署步骤

### 1. 初始化 Git 仓库（如果尚未创建）

```bash
cd /Users/le/Downloads/code/202606/web_ASR
git init
git add .
git commit -m "Initial commit - Echo v0.0.1"
```

### 2. 推送到 GitHub

```bash
# 在 GitHub 创建新仓库（如 echo-asr）
# 然后关联并推送
git remote add origin https://github.com/你的用户名/echo-asr.git
git branch -M main
git push -u origin main
```

### 3. 导入到 Vercel

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **"Add New..."** → **"Project"**
3. 选择刚推送的 GitHub 仓库 `echo-asr`
4. Vercel 会自动识别为 Vite 项目，无需修改构建配置

### 4. 配置环境变量

在 Vercel 项目设置页面：

1. 进入 **Settings** → **Environment Variables**
2. 添加以下变量：

| 变量名 | 值 | 说明 |
|--------|---|------|
| `VITE_ASR_ENDPOINT` | `https://le0609--chinese-asr-serve.modal.run` | ASR 服务地址 |

3. 点击 **Save**

### 5. 部署

1. 点击 **"Deploy"**
2. 等待构建完成（约 1-2 分钟）
3. 构建成功后，Vercel 会生成一个 `.vercel.app` 域名
4. 访问域名测试功能

---

## ✅ 部署后验证

### 功能检查清单

- [ ] 访问部署的域名，页面正常加载
- [ ] 上传一个音频文件（建议 <5MB）
- [ ] 选择"快速模式"或"精准模式"，点击"开始转写"
- [ ] 首次使用精准模式，会提示"冷启动 10-30 秒"（正常）
- [ ] 转写完成后，文本显示在编辑区
- [ ] 点击"导出 TXT"，下载成功
- [ ] 查看历史记录，音频可以回放
- [ ] 打开浏览器控制台（F12），检查是否有网络错误

### 常见问题排查

**问题 1：转写一直卡在 5% 不动**
- 原因：后端 Modal 服务休眠，正在冷启动
- 解决：耐心等待 10-30 秒，后续请求会恢复正常速度

**问题 2：提示"请求失败 (HTTP 404)"**
- 原因：环境变量未正确设置
- 解决：检查 Vercel Dashboard → Settings → Environment Variables，确认 `VITE_ASR_ENDPOINT` 已设置

**问题 3：转写结果为空**
- 原因：音频格式不支持或文件损坏
- 解决：尝试其他音频文件（建议 WAV/MP3），或检查浏览器控制台错误信息

---

## 🔄 后续更新部署

每次代码修改后，只需推送到 GitHub：

```bash
git add .
git commit -m "更新说明"
git push
```

Vercel 会自动检测到推送，触发重新构建和部署（约 1-2 分钟）。

---

## 🌐 绑定自定义域名（可选）

1. 在 Vercel Dashboard → **Settings** → **Domains**
2. 添加你的域名（如 `echo.yourdomain.com`）
3. 按照提示在域名服务商添加 CNAME 记录：
   - 类型：`CNAME`
   - 名称：`echo`
   - 值：`cname.vercel-dns.com`
4. 等待 DNS 生效（通常 5-30 分钟）
5. Vercel 会自动配置 HTTPS 证书

---

## 📊 监控与日志

### 查看部署日志
1. Vercel Dashboard → 你的项目 → **Deployments**
2. 点击任意部署记录，查看构建日志

### 查看运行时日志
1. Vercel Dashboard → 你的项目 → **Logs**
2. 可以看到用户访问日志和前端错误

### 后端 ASR 日志
访问 [Modal Dashboard](https://modal.com/apps/le0609/main/deployed/chinese-asr) 查看转写请求日志

---

## 💡 优化建议

### 1. 配置 UptimeRobot 保持后端热启动（可选）

Modal 后端 5 分钟无请求会休眠，可以用免费的 UptimeRobot 定期 ping：

1. 注册 [UptimeRobot](https://uptimerobot.com/)
2. 添加监控：
   - 类型：HTTP(s)
   - URL：`https://le0609--chinese-asr-serve.modal.run/`
   - 监控间隔：5 分钟
3. 这样后端会保持热启动，用户无需等待冷启动

### 2. 启用 Vercel Analytics（可选）

1. Vercel Dashboard → 你的项目 → **Analytics**
2. 点击 **Enable**
3. 可以看到访问量、页面性能等数据

---

## 🔒 安全建议

- **不要在前端代码中硬编码 API 密钥**（当前无需密钥）
- **如果后端添加了鉴权**，密钥应通过环境变量 `VITE_ASR_API_KEY` 配置
- **定期检查 Vercel 日志**，防止恶意访问

---

## 📞 技术支持

遇到部署问题，请提供：
1. Vercel 部署日志截图
2. 浏览器控制台错误信息（F12 → Console）
3. 访问的 URL 和操作步骤

联系方式：
- GitHub Issues: https://github.com/你的用户名/echo-asr/issues
- Modal 服务状态: https://modal.com/apps/le0609/main/deployed/chinese-asr

---

**部署完成！** 🎉

你的 Echo 应用已上线，可以分享给其他用户使用了。
