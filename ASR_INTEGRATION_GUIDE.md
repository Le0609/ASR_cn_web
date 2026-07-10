# ASR 引擎接入指南

本文档面向需要将本地训练的 ASR 模型接入到 Echo 语音转文字平台的开发者。

---

## 📋 目录

1. [接入前准备](#接入前准备)
2. [接口规范](#接口规范)
3. [接入步骤](#接入步骤)
4. [常见场景](#常见场景)
5. [测试验证](#测试验证)
6. [FAQ](#faq)

---

## 接入前准备

### 当前架构概览

Echo 使用统一的 `ASRService` 接口抽象所有语音识别逻辑，当前使用 **Mock 实现**（模拟 2s 延迟返回假数据），接入真实引擎只需：

1. 实现 `ASRService` 接口
2. 替换 `src/api/asr.ts` 底部的服务实例导出

### 支持的音频输入

Echo 支持两种音频来源，产出的都是标准 `File` 对象：

1. **用户上传文件**  
   - 支持格式：`.mp3`、`.wav`、`.m4a`
   - 大小限制：50MB
   - 前端会校验 MIME 类型和扩展名

2. **在线录音**  
   - 自动编码为：**16kHz / 16bit / 单声道 PCM WAV**
   - 文件名格式：`录音_MMDD_HHmmss.wav`
   - 通过 Web Audio API 采集，保证规格精确可控

### 必需的返回数据

ASR 引擎必须返回 `TranscriptionResult` 类型（定义见 `src/types/index.ts`）：

```typescript
interface TranscriptionResult {
  /** 分段结果（用于生成 SRT 字幕），必须按时间升序 */
  segments: Array<{
    text: string;       // 片段文本
    startTime: number;  // 开始时间（秒）
    endTime: number;    // 结束时间（秒）
  }>;
  /** 完整文本（用于编辑区和 TXT 导出） */
  fullText: string;
  /** 音频总时长（秒） */
  duration: number;
}
```

---

## 接口规范

### ASRService 接口定义

```typescript
// src/api/asr.ts

interface ASRService {
  /**
   * 上传音频文件并转写
   * @param file - 音频文件（File 对象）
   * @param options - 可选配置
   * @returns Promise<TranscriptionResult>
   */
  uploadAndTranscribe(
    file: File,
    options?: TranscribeOptions,
  ): Promise<TranscriptionResult>;
}

interface TranscribeOptions {
  /** 进度回调（0 ~ 1），用于更新前端进度条 */
  onProgress?: (progress: number) => void;
  /** 取消信号（用户点"重新上传"时会 abort） */
  signal?: AbortSignal;
}
```

---

## 接入步骤

### Step 1: 创建自定义服务类

在 `src/api/asr.ts` 文件底部（注释掉的 `RealASRService` 示例之后）添加你的实现：

```typescript
/**
 * 本地 ASR 引擎服务
 * 假设你的模型部署在 http://localhost:8000/transcribe
 */
class LocalASRService implements ASRService {
  private endpoint: string;

  constructor(endpoint: string = 'http://localhost:8000/transcribe') {
    this.endpoint = endpoint;
  }

  async uploadAndTranscribe(
    file: File,
    options: TranscribeOptions = {},
  ): Promise<TranscriptionResult> {
    const { onProgress, signal } = options;

    // 1. 构造 FormData（或根据你的 API 要求调整）
    const formData = new FormData();
    formData.append('audio', file);
    // 如果需要额外参数（如语言、模型版本），在此添加
    // formData.append('language', 'zh');

    // 2. 上报初始进度
    onProgress?.(0.1);

    // 3. 发起请求
    const response = await fetch(this.endpoint, {
      method: 'POST',
      body: formData,
      signal, // 支持用户取消
    });

    if (!response.ok) {
      throw new Error(`ASR 请求失败：HTTP ${response.status}`);
    }

    // 4. 模拟进度更新（如果是流式返回，在此监听 stream）
    onProgress?.(0.5);

    // 5. 解析响应
    const data = await response.json();
    onProgress?.(0.9);

    // 6. 将你的 API 响应映射为 TranscriptionResult
    const result: TranscriptionResult = {
      segments: data.segments.map((seg: any) => ({
        text: seg.text,
        startTime: seg.start,  // 确保是秒，不是毫秒
        endTime: seg.end,
      })),
      fullText: data.full_text || data.segments.map((s: any) => s.text).join(''),
      duration: data.duration,
    };

    onProgress?.(1.0);
    return result;
  }
}
```

### Step 2: 替换服务实例

修改 `src/api/asr.ts` 文件底部的导出：

```typescript
// 将这行：
// export const asrService: ASRService = new MockASRService();

// 改为：
export const asrService: ASRService = new LocalASRService('http://localhost:8000/transcribe');
```

### Step 3: 验证类型映射

确保你的 API 响应能正确映射为 `TranscriptionResult`：

**常见问题**：
- ⚠️ 时间戳单位：ASR 引擎返回的时间戳如果是**毫秒**，需要除以 1000 转为秒
- ⚠️ 空片段：如果 `segments` 为空或缺失，前端导出 SRT 时会失败，确保至少返回一个片段
- ⚠️ 总时长：`duration` 应为音频实际时长（秒），不是转写耗时

**调试技巧**：在 `uploadAndTranscribe` 最后加一行打印：
```typescript
console.log('[ASR Response]', result);
return result;
```

---

## 常见场景

### 场景 1：流式返回（WebSocket / SSE）

如果你的 ASR 引擎是流式实时返回片段，可以这样改造：

```typescript
async uploadAndTranscribe(
  file: File,
  options: TranscribeOptions = {},
): Promise<TranscriptionResult> {
  const { onProgress, signal } = options;
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8000/transcribe');
    const segments: TranscriptionSegment[] = [];
    
    ws.onopen = () => {
      // 发送音频（可能需要分块或 base64 编码）
      file.arrayBuffer().then(buffer => {
        ws.send(buffer);
      });
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'progress') {
        onProgress?.(data.value);
      } else if (data.type === 'segment') {
        segments.push({
          text: data.text,
          startTime: data.start,
          endTime: data.end,
        });
      } else if (data.type === 'complete') {
        resolve({
          segments,
          fullText: segments.map(s => s.text).join(''),
          duration: data.duration,
        });
        ws.close();
      }
    };
    
    ws.onerror = () => reject(new Error('WebSocket 连接失败'));
    signal?.addEventListener('abort', () => ws.close());
  });
}
```

### 场景 2：需要预处理音频格式

如果你的模型只接受特定格式（如必须是 16kHz WAV），而用户上传了 MP3：

**方案 A**：后端处理（推荐）
- 在你的 ASR 服务端用 FFmpeg 自动转换

**方案 B**：前端预处理
```typescript
async uploadAndTranscribe(file: File, options: TranscribeOptions = {}): Promise<TranscriptionResult> {
  // 如果不是 WAV，先用 Web Audio API 转换
  if (!file.name.endsWith('.wav')) {
    file = await this.convertToWav(file);
  }
  // 再走原流程...
}

private async convertToWav(file: File): Promise<File> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // 提取 PCM 并编码为 WAV（复用 src/utils/wav.ts 的 encodeWav）
  const pcm = audioBuffer.getChannelData(0);
  const blob = encodeWav(pcm, audioBuffer.sampleRate);
  return new File([blob], file.name.replace(/\.[^.]+$/, '.wav'), { type: 'audio/wav' });
}
```

### 场景 3：需要鉴权 Token

```typescript
class LocalASRService implements ASRService {
  constructor(
    private endpoint: string,
    private apiKey: string,
  ) {}

  async uploadAndTranscribe(file: File, options: TranscribeOptions = {}): Promise<TranscriptionResult> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        // 或其他鉴权方式，如 'X-API-Key': this.apiKey
      },
      body: formData,
      signal: options.signal,
    });
    // ... 其余逻辑
  }
}

// 使用时传入 token
export const asrService = new LocalASRService(
  'http://localhost:8000/transcribe',
  'your-api-key-here',
);
```

---

## 测试验证

### 1. 启动前端开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 2. 确保你的 ASR 服务已启动

```bash
# 示例：假设你的模型服务运行在 8000 端口
curl -X POST http://localhost:8000/transcribe \
  -F "audio=@test.wav"
```

### 3. 测试流程

#### 测试上传文件
1. 点击 "📁 上传音频文件" Tab
2. 拖拽一个 `.wav` / `.mp3` 文件到上传区
3. 观察：
   - 校验阶段：提取元信息（时长、大小）
   - 转写阶段：进度条从 0% → 100%
   - 成功后：编辑区显示转写文本

#### 测试在线录音
1. 点击 "🎙️ 在线录音" Tab
2. 点红色麦克风按钮，授权浏览器麦克风权限
3. 对着电脑说话（观察实时波形跳动）
4. 点击 "停止并转写"
5. 观察：自动走转写流程，编辑区显示结果

#### 测试导出
1. 编辑区可以手动修改文本
2. 点击 "下载 TXT" → 获得纯文本文件
3. 点击 "下载 SRT" → 获得带时间轴的字幕文件（格式验证：用播放器加载）

#### 测试历史记录
1. 多次转写不同文件
2. 右侧历史面板会累积记录（最多 20 条）
3. 点击历史条目 → 恢复到编辑区
4. 点击删除图标 → 移除单条
5. 点击 "清空全部" → 清空历史

### 4. 常见错误排查

| 错误现象 | 可能原因 | 解决方案 |
|---------|---------|---------|
| 进度条卡在 10% 不动 | ASR 服务未启动或 CORS 问题 | 检查后端日志，确保允许跨域请求 |
| 返回结果但编辑区为空 | `fullText` 字段缺失或为空字符串 | 检查 API 响应，确保返回了 `full_text` 或拼接 `segments[].text` |
| SRT 导出失败 | `segments` 为空或时间戳格式错误 | 打开浏览器控制台查看 `[ASR Response]`，确保 `segments` 数组有内容 |
| 录音后转写失败 | 后端不支持 16kHz WAV | 在后端加 FFmpeg 自动转换，或在前端改采样率（修改 `src/utils/wav.ts` 的 `REC_SAMPLE_RATE`） |

---

## FAQ

### Q1: 我的模型只支持中文，如何禁用其他语言？
**A**: 前端不做语言限制，由后端 ASR 引擎自动识别。如果需要前端选择语言，可在 `Uploader` 或 `Recorder` 组件加一个语言下拉框，然后在 `uploadAndTranscribe` 时通过 `FormData` 传给后端。

### Q2: 如何处理超长音频（>1小时）？
**A**: 
1. **前端**：修改 `src/utils/audio.ts` 的 `MAX_FILE_SIZE`（当前 50MB）
2. **后端**：实现分片上传 + 分段转写，前端监听 `onProgress` 实时更新
3. **优化**：大文件建议后端异步处理，返回任务 ID，前端轮询结果

### Q3: 能否支持视频文件（提取音轨转写）？
**A**: 
1. 修改 `src/utils/audio.ts` 的 `ALLOWED_EXTENSIONS` 加入 `'mp4', 'mov'` 等
2. 后端用 FFmpeg 提取音轨后再转写
3. 前端 `buildAudioMeta` 可能无法获取视频时长，需后端返回

### Q4: 如何接入云服务（讯飞、阿里云、腾讯云）？
**A**: 参考各家 SDK 文档，通常需要：
```typescript
class XunfeiASRService implements ASRService {
  async uploadAndTranscribe(file: File, options: TranscribeOptions = {}): Promise<TranscriptionResult> {
    // 1. 将 File 转为 base64 或 ArrayBuffer
    const buffer = await file.arrayBuffer();
    
    // 2. 调用讯飞 SDK（需先 npm install 对应 SDK）
    import XunfeiSDK from 'xunfei-asr-sdk';
    const sdk = new XunfeiSDK({ appId: 'xxx', apiKey: 'xxx' });
    const result = await sdk.recognize(buffer);
    
    // 3. 映射为 TranscriptionResult
    return {
      segments: result.data.map(/* ... */),
      fullText: result.text,
      duration: result.duration,
    };
  }
}
```

### Q5: 前端能否直接运行 ONNX/WASM 模型（无需后端）？
**A**: 可以，但**不推荐**用于生产：
- ASR 模型通常几百 MB，下载耗时长
- 浏览器 CPU 推理速度慢，体验差
- 建议：小模型（<50MB）可尝试 `onnxruntime-web`，大模型必须走后端

---

## 附录：完整示例代码

### 最小可用示例（假设后端返回标准 JSON）

```typescript
// src/api/asr.ts 底部添加

class MyASRService implements ASRService {
  async uploadAndTranscribe(
    file: File,
    options: TranscribeOptions = {},
  ): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('audio', file);

    options.onProgress?.(0.1);

    const res = await fetch('http://localhost:8000/api/transcribe', {
      method: 'POST',
      body: formData,
      signal: options.signal,
    });

    if (!res.ok) throw new Error(`转写失败: ${res.status}`);

    options.onProgress?.(0.8);
    const data = await res.json();

    // 假设后端返回：
    // {
    //   "segments": [{"text": "...", "start": 0.0, "end": 1.5}, ...],
    //   "text": "完整文本",
    //   "duration": 120.5
    // }

    return {
      segments: data.segments.map((s: any) => ({
        text: s.text,
        startTime: s.start,
        endTime: s.end,
      })),
      fullText: data.text,
      duration: data.duration,
    };
  }
}

export const asrService: ASRService = new MyASRService();
```

### CORS 配置示例（FastAPI 后端）

```python
# backend/main.py
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 允许前端跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # 开发环境
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    # 调用你的 ASR 模型
    result = your_asr_model.transcribe(audio.file)
    
    return {
        "segments": result["segments"],
        "text": result["full_text"],
        "duration": result["duration"]
    }
```

---

## 总结

接入流程核心三步：

1. **实现** `ASRService` 接口的 `uploadAndTranscribe` 方法
2. **映射** 你的 API 响应为 `TranscriptionResult` 类型
3. **替换** `src/api/asr.ts` 底部的 `asrService` 导出

前端已处理好文件校验、进度显示、错误提示、历史记录、导出等所有 UI 逻辑，你只需专注于：

- 将 `File` 对象发送到你的 ASR 服务
- 解析响应并返回规范的结构

如遇问题，打开浏览器控制台（F12 → Console）查看错误日志，或检查网络请求（Network 面板）。

祝接入顺利！🎉
