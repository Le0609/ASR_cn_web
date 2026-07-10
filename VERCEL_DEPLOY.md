## 🚀 Vercel 部署步骤

### 1. 推送到 GitHub

```bash
# 如果还没有创建 GitHub 仓库，先在 GitHub 网站创建一个新仓库（如 echo-asr）

# 关联远程仓库
git remote add origin https://github.com/你的用户名/echo-asr.git

# 推送代码
git branch -M main
git push -u origin main
```

### 2. 在 Vercel 导入项目

1. 访问 https://vercel.com/dashboard
2. 点击 **"Add New..."** → **"Project"**
3. 选择你的 GitHub 账号，授权 Vercel 访问
4. 在仓库列表中找到 `echo-asr`，点击 **"Import"**

### 3. 配置构建设置

Vercel 会自动检测为 Vite 项目，默认配置即可：

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 4. 设置环境变量（重要！）

在配置页面找到 **"Environment Variables"** 部分：

| 名称 | 值 |
|------|---|
| `VITE_ASR_ENDPOINT` | `https://le0609--chinese-asr-serve.modal.run` |

点击 **"Add"** 添加。

### 5. 开始部署

点击页面底部的 **"Deploy"** 按钮。

Vercel 会开始构建：
- 安装依赖（约 30 秒）
- 运行 TypeScript 类型检查
- 执行 Vite 构建
- 部署到全球 CDN

整个过程约 1-2 分钟。

### 6. 访问你的应用

部署成功后，Vercel 会生成一个域名，格式如：
```
https://echo-asr-你的用户名.vercel.app
```

点击链接访问，测试功能是否正常。

---

## ✅ 部署验证清单

访问部署的网站后，依次测试：

- [ ] 页面正常加载，无白屏或错误
- [ ] 上传一个音频文件（建议 <5MB 的 MP3/WAV）
- [ ] 选择"快速模式"，点击"开始转写"
- [ ] 等待转写完成（首次可能需要 10-30 秒冷启动）
- [ ] 检查转写结果是否显示在编辑区
- [ ] 点击"导出 TXT"，下载成功
- [ ] 切换到"精准模式"，再转写一个文件
- [ ] 查看历史记录，点击加载，音频可以播放
- [ ] 打开浏览器控制台（F12），确认无网络错误

---

## 🔧 常见部署问题

### 问题 1: 构建失败 "Module not found"

**原因**: 依赖安装失败或版本不兼容

**解决**:
1. 检查 `package.json` 中的依赖版本
2. 在本地执行 `npm run build` 确认能构建成功
3. 删除 `node_modules` 和 `package-lock.json`，重新 `npm install`
4. 提交更新后的 `package-lock.json`

### 问题 2: 部署成功但页面空白

**原因**: 环境变量未设置或路由配置问题

**解决**:
1. 检查 Vercel Dashboard → Settings → Environment Variables
2. 确认 `VITE_ASR_ENDPOINT` 已设置
3. 重新部署：Deployments → 最新部署 → 右上角三个点 → Redeploy

### 问题 3: 转写功能不工作

**原因**: 后端服务不可达或 CORS 问题

**解决**:
1. 在浏览器控制台（F12 → Network）查看 API 请求
2. 确认请求的 URL 是 `https://le0609--chinese-asr-serve.modal.run/api/predict`
3. 检查是否有 CORS 错误（跨域问题）
4. 访问后端地址 https://le0609--chinese-asr-serve.modal.run 确认服务在线

### 问题 4: "首次加载很慢"

**原因**: Modal 后端冷启动（正常现象）

**说明**:
- Modal Serverless 5 分钟无请求会休眠
- 首次请求需要 10-30 秒唤醒
- 后续请求会很快（<1 秒）

**优化**（可选）:
配置 UptimeRobot 定期 ping 后端，保持热启动（详见 DEPLOYMENT.md）

---

## 📊 部署后优化

### 1. 绑定自定义域名

如果你有自己的域名（如 `yourdomain.com`）：

1. Vercel Dashboard → 你的项目 → **Settings** → **Domains**
2. 输入域名，如 `echo.yourdomain.com`
3. 按照提示在域名服务商添加 DNS 记录：
   - 类型: `CNAME`
   - 名称: `echo`
   - 值: `cname.vercel-dns.com`
4. 等待 DNS 生效（通常 5-30 分钟）
5. Vercel 会自动配置 HTTPS 证书

### 2. 启用 Vercel Analytics

1. Vercel Dashboard → 你的项目 → **Analytics**
2. 点击 **Enable**
3. 可以看到：
   - 页面访问量
   - 用户地理分布
   - 页面加载速度
   - 设备类型统计

### 3. 配置后端保活（可选）

使用免费的 UptimeRobot 定期 ping 后端，避免冷启动：

1. 注册 https://uptimerobot.com/
2. 添加新监控：
   - Monitor Type: HTTP(s)
   - URL: `https://le0609--chinese-asr-serve.modal.run/`
   - Monitoring Interval: 5 minutes
3. 这样后端会保持热启动，用户体验更好

---

## 🎯 下一步

部署完成后，你可以：

1. **分享链接**：把 Vercel 生成的域名分享给其他人使用
2. **监控使用**：在 Vercel Analytics 查看访问数据
3. **查看日志**：Vercel Dashboard → Logs 查看运行时错误
4. **持续更新**：修改代码后 `git push`，Vercel 自动重新部署

---

## 📞 需要帮助？

如遇问题，请提供：
1. Vercel 部署日志截图（Dashboard → Deployments → 点击部署记录）
2. 浏览器控制台错误（F12 → Console）
3. 部署的 URL

参考文档：
- [Vercel 官方文档](https://vercel.com/docs)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)
- 项目技术债务文档：[TECH_DEBT.md](./TECH_DEBT.md)

---

**部署完成！** 🎉

你的 Echo 应用已经上线，可以在任何地方访问了。
