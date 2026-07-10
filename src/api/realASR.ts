/**
 * 真实 ASR 引擎服务
 * 对接 Modal 部署的 Gradio ASR 服务（三段式协议）：
 *   1. POST /gradio_api/upload           上传音频 → 返回文件路径
 *   2. POST /gradio_api/call/transcribe  提交任务 → 返回 event_id
 *   3. GET  /gradio_api/call/transcribe/{event_id}（SSE）→ 监听识别结果
 * 支持自动重试（3次，指数退避）+ 冷启动检测
 */

import type { ASRService, TranscribeOptions } from './asr';
import type { TranscriptionResult } from '../types';
import { withRetry, isClientError } from '../utils/retry';

/** SSE 等待上限（毫秒）：FunASR 冷启动实测最长约 80 秒，留出余量 */
const SSE_TIMEOUT_MS = 120000;

export class RealASRService implements ASRService {
  private endpoint: string;

  constructor(endpoint: string = import.meta.env.VITE_ASR_ENDPOINT || 'https://le0609--chinese-asr-serve.modal.run') {
    this.endpoint = endpoint;
  }

  async uploadAndTranscribe(file: File, options: TranscribeOptions = {}): Promise<TranscriptionResult> {
    const { onProgress, signal, mode = 'accurate' } = options;

    return withRetry(
      async () => {
        onProgress?.(0.05);

        const gradioMode = mode === 'fast' ? '快速模式 (Conformer)' : '高精度模式 (FunASR)';

        // 步骤 1：上传音频文件
        const uploadForm = new FormData();
        uploadForm.append('files', file);

        const uploadRes = await fetch(`${this.endpoint}/gradio_api/upload`, {
          method: 'POST',
          body: uploadForm,
          signal,
        });

        if (!uploadRes.ok) {
          throw new Error(`音频上传失败 (HTTP ${uploadRes.status})`);
        }

        const uploadResult = await uploadRes.json();
        const filePath = uploadResult[0];
        if (!filePath) {
          throw new Error('音频上传未返回有效路径，请重试');
        }

        onProgress?.(0.2);

        // 步骤 2：提交转写任务
        const callRes = await fetch(`${this.endpoint}/gradio_api/call/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [{ path: filePath, meta: { _type: 'gradio.FileData' } }, gradioMode],
          }),
          signal,
        });

        if (!callRes.ok) {
          throw new Error(`转写请求失败 (HTTP ${callRes.status})`);
        }

        const callResult = await callRes.json();
        const eventId = callResult.event_id;
        if (!eventId) {
          throw new Error('未获取到任务 ID，请重试');
        }

        onProgress?.(0.3);

        // 步骤 3：通过 SSE 监听识别结果
        const { text, metrics } = await this.listenForResult(eventId, signal, onProgress);

        // metrics 示例："⏱️ 音频时长: 3.5秒\n⚡ 处理耗时: 0.08秒\n📊 CER: ~29%"
        let processingTime = 0;
        const timeMatch = metrics.match(/处理耗时[:：]\s*([\d.]+)\s*(?:秒|s)/);
        if (timeMatch) processingTime = parseFloat(timeMatch[1]);

        let duration = 0;
        const durationMatch = metrics.match(/音频时长[:：]\s*([\d.]+)\s*(?:秒|s)/);
        if (durationMatch) duration = parseFloat(durationMatch[1]);

        const result: TranscriptionResult = {
          segments: [], // Gradio 后端不返回时间戳分段
          fullText: text,
          duration,
          stats: {
            processingTime,
          },
        };

        onProgress?.(1);
        return result;
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        shouldRetry: (err) => {
          // 用户取消不重试
          if (err.name === 'AbortError') return false;
          // 客户端错误（4xx、格式不支持等）不重试
          if (isClientError(err)) return false;
          // 其他错误（网络、5xx、SSE 超时）自动重试
          return true;
        },
        onRetry: (attempt, err) => {
          if (import.meta.env.DEV) {
            console.warn(`[ASR] 重试第 ${attempt} 次:`, err.message);
          }
        },
      },
    );
  }

  /**
   * 通过 SSE 监听 Gradio 任务结果。
   * Gradio 用同一个 'error' 事件名承载两种情况：服务端显式报错（带 e.data）
   * 与连接层异常（不带 e.data），需要通过 e.data 是否存在来区分。
   */
  private listenForResult(
    eventId: string,
    signal: AbortSignal | undefined,
    onProgress?: (p: number) => void,
  ): Promise<{ text: string; metrics: string }> {
    return new Promise((resolve, reject) => {
      const url = `${this.endpoint}/gradio_api/call/transcribe/${eventId}`;
      const eventSource = new EventSource(url);
      let settled = false;
      let progress = 0.3;

      // 冷启动等待期间，缓慢逼近 95%，避免进度条长时间静止
      const progressTimer = window.setInterval(() => {
        progress = Math.min(0.95, progress + 0.015);
        onProgress?.(progress);
      }, 1000);

      const timeoutTimer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        finish();
        reject(new Error('识别响应超时，请稍后重试（后端可能仍在冷启动）'));
      }, SSE_TIMEOUT_MS);

      const onAbort = () => {
        if (settled) return;
        settled = true;
        finish();
        reject(new DOMException('转写已取消', 'AbortError'));
      };
      signal?.addEventListener('abort', onAbort);

      function finish() {
        clearInterval(progressTimer);
        clearTimeout(timeoutTimer);
        signal?.removeEventListener('abort', onAbort);
        eventSource.close();
      }

      eventSource.addEventListener('complete', (e: MessageEvent) => {
        if (settled) return;
        settled = true;
        finish();
        try {
          const data = JSON.parse(e.data);
          resolve({ text: data[0] || '', metrics: data[1] || '' });
        } catch {
          reject(new Error('解析识别结果失败，请重试'));
        }
      });

      eventSource.addEventListener('error', (e: MessageEvent) => {
        if (settled) return;
        settled = true;
        finish();
        let msg = '识别失败或连接中断，请重试';
        if (e.data) {
          try {
            const errData = JSON.parse(e.data);
            msg = typeof errData === 'string' ? errData : JSON.stringify(errData);
          } catch {
            /* 忽略解析错误，使用默认提示 */
          }
        }
        reject(new Error(msg));
      });
    });
  }

  /** 健康检查，返回后端是否在线（用于前端状态提示） */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.endpoint}/`, {
        signal: AbortSignal.timeout(5000),
      });
      // Gradio 根路径返回 200 表示服务在线（冷启动期间可能超时，非真实离线）
      return res.ok;
    } catch {
      return false;
    }
  }
}
