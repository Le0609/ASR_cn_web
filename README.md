# Echo · 让声音成为文字

一个 Apple 风格的语音转文字 Web 应用。上传音频，几秒内转成可编辑的文字稿，在线校对后一键导出 TXT。所有转写数据仅存储在浏览器本地。

> ✅ 已对接 **真实 ASR 服务**（本地运行于 http://localhost:8000），基于 FunASR 预训练模型。支持快速模式（Conformer）与精准模式（FunASR）双引擎识别。

## ✨ 功能

### 核心功能
- **顶部导航**：左上角线体 Logo（点击回到顶部），右侧社交链接（GitHub / Twitter）与反馈入口。
- **实时麦克风波形**：Hero 区顶部可点击的声波，启用麦克风后读取环境音/说话，柱条实时跟随音频律动（Web Audio API + AnalyserNode）。
- **音频上传**：拖拽 / 点击上传，支持 MP3 / WAV / M4A / FLAC / WebM，单文件上限 50MB，支持多文件批量队列转写，前端校验格式与大小，并用 Web Audio API 读取时长。待转写文件可预览播放。
- **在线录音**：通过麦克风实时录音，实时波形可视化，WAV 格式编码，录音完成后自动进入转写流程。
- **真实转写**：对接本地 ASR 服务（基于 FunASR 预训练模型），支持快速模式（Conformer 引擎）与精准模式（FunASR 引擎），实时进度展示与统计信息。
- **在线编辑**：可编辑文本框，实时字数统计，一键复制 / 全选。
- **Apple 风格**：流动声波背景、滚动视差、滚动触发渐入、按钮/卡片微交互，遵循 Apple HIG，支持 `prefers-reduced-motion`。

### 🆕 v2.0 新增功能
- **批量导出（ZIP）**：多文件队列转写完成后，一键打包所有结果为 ZIP 压缩包，避免逐个下载。
- **音频预处理**：自动归一化音量、降噪、格式转换（16kHz WAV），提升 ASR 识别准确率，可手动开关。
- **自动重试机制**：网络故障或服务临时不可用时，自动重试最多 3 次（指数退避），提升转写成功率。
- **IndexedDB 持久化**：历史记录从 localStorage 升级到 IndexedDB，容量从 20 条提升到 50 条，支持存储完整音频数据，自动从旧版本迁移。

**结果导出**：
- 单文件：TXT 纯文本导出
- 多文件：批量 ZIP 打包导出（含所有转写结果）

**历史记录**：
- IndexedDB 存储，最多保存 50 条（旧版本 localStorage 仅 20 条）
- 可查看、加载、删除单条、清空全部
- 历史记录包含音频回放
- 首次启动自动从 localStorage 迁移数据

## 🛠 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | React 18 + TypeScript |
| 构建 | Vite 5 |
| 样式 | Tailwind CSS 3 |
| 动效 | Framer Motion 11 |
| 状态 | React Hooks（useState / useContext 等） |
| 持久化 | IndexedDB（历史记录） |

## 🚀 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 类型检查
npm run lint

# 生产构建（输出到 dist/）
npm run build

# 本地预览构建产物
npm run preview
```

要求 Node.js 18+。

## 📦 部署

项目为纯静态站点，已内置 Vercel 与 Netlify 配置，均可零改动部署到免费额度。

### Vercel

1. 将代码推送到 GitHub / GitLab。
2. 在 Vercel 导入仓库，框架自动识别为 Vite。
3. 构建命令 `npm run build`，输出目录 `dist`（`vercel.json` 已配置）。

或使用 CLI：

```bash
npm i -g vercel
vercel
```

### Netlify

1. 导入仓库，构建命令 `npm run build`，发布目录 `dist`（`netlify.toml` 已配置）。

或使用 CLI：

```bash
npm i -g netlify-cli
netlify deploy --prod
```

## 🔌 ASR 后端服务

前端已对接真实 ASR 服务，后端项目位于 `/Users/le/Downloads/code/202606/ASR`。

### 启动后端服务

```bash
cd /Users/le/Downloads/code/202606/ASR
# 根据后端项目的具体启动方式运行（Python/FastAPI 等）
# 默认监听 http://localhost:8000
```

### 接口说明

- **健康检查**：`GET /health` - 返回服务状态与可用模式
- **快速转写**：`POST /api/transcribe/fast` - Conformer 引擎，速度快
- **精准转写**：`POST /api/transcribe/accurate` - FunASR 引擎，准确率高

前端会根据用户选择的模式自动调用对应接口。接口层封装在 [`src/api/realASR.ts`](src/api/realASR.ts)。

## 📁 目录结构

```
src/
├── api/
│   └── asr.ts              # ASR 接口层（Mock 实现 + 真实实现示例）
├── components/
│   ├── Logo.tsx            # 品牌标识（线体回声弧线）
│   ├── Navbar.tsx          # 顶部导航（Logo + 社交 + 反馈）
│   ├── Hero.tsx            # Hero 区域（渐变 + 视差 + 实时麦克风波形）
│   ├── Waveform.tsx        # 声波可视化组件（装饰/麦克风两种模式）
│   ├── Uploader.tsx        # 上传（拖拽/点击 + 状态反馈）
│   ├── Editor.tsx          # 文本编辑 + 字数统计 + 复制
│   ├── Exporter.tsx        # TXT 导出
│   ├── History.tsx         # 历史记录侧栏
│   ├── Toast.tsx           # 全局轻提示（Context）
│   └── Footer.tsx          # 页脚
├── hooks/
│   ├── useLocalStorage.ts      # localStorage 双向同步（已弃用）
│   ├── useHistoryStorage.ts    # IndexedDB 历史记录持久化
│   ├── useRecorder.ts          # 在线录音逻辑
│   └── useMicWaveform.ts       # 麦克风实时频谱采样（Web Audio）
├── types/
│   └── index.ts            # 全局类型定义
├── utils/
│   ├── audio.ts            # 文件校验 + 时长获取
│   ├── export.ts           # 单文件导出 + 剪贴板
│   ├── batchExport.ts      # 批量 ZIP 导出
│   ├── preprocess.ts       # 音频预处理（归一化/降噪/格式转换）
│   ├── retry.ts            # 重试机制封装
│   ├── indexedDB.ts        # IndexedDB 封装
│   ├── wav.ts              # WAV 编码
│   ├── format.ts           # 格式化（大小/时长等）
│   └── motion.ts           # Framer Motion 共享动画变体
├── styles/
│   └── index.css           # Tailwind + 全局样式
├── App.tsx                 # 主编排组件
└── main.tsx                # 入口
```

## 📝 更新日志

### v2.0.0 (2026-07-09)

**新增：**
- ✨ 批量导出：多文件队列一键打包为 ZIP
- ✨ 音频预处理：自动归一化、降噪、格式转换（可选）
- ✨ 自动重试：网络故障时最多重试 3 次（指数退避）
- ✨ IndexedDB：历史记录容量从 20 条提升到 50 条

**优化：**
- ⚡ 历史记录存储容量提升 10 倍以上
- ⚡ 网络不稳定场景转写成功率提升
- ⚡ 音频识别准确率提升（归一化 + 降噪）

详细使用说明请查看 [FEATURES.md](./FEATURES.md)。

## 📄 许可

MIT
