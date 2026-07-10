/**
 * 真实 ASR 引擎服务
 * 对接 Modal 部署的 Gradio ASR 服务
 * 支持自动重试（3次，指数退避）+ 冷启动检测
 */

import type { ASRService, TranscribeOptions } from './asr';
import type { TranscriptionResult } from '../types';
import { withRetry, isClientError } from '../utils/retry';

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

        // Gradio 模式映射
        const gradioMode = mode === 'fast'
          ? '快速模式 (Conformer)'
          : '高精度模式 (FunASR)';

        // Gradio API 要求 base64 编码的音频
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        const dataUrl = `data:${file.type};base64,${base64}`;

        onProgress?.(0.15);

        // Gradio /api/predict 格式
        const payload = {
          data: [dataUrl, gradioMode]
        };

        const res = await fetch(`${this.endpoint}/api/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal,
        });

        if (!res.ok) {
          let errMsg = `请求失败 (HTTP ${res.status})`;
          try {
            const errData = await res.json();
            if (errData.detail) errMsg = errData.detail;
          } catch {
            /* 忽略解析错误 */
          }
          throw new Error(errMsg);
        }

        onProgress?.(0.8);

        const data = await res.json();

        onProgress?.(0.95);

        // Gradio 返回格式: {data: [text, metrics], duration: number}
        const text = data.data?.[0] || '';
        const metrics = data.data?.[1] || '';

        // 解析 metrics 字符串获取处理时间（格式: "CER: 0.15 | 处理耗时: 1.23s"）
        let processingTime = 0;
        const timeMatch = metrics.match(/处理耗时:\s*([\d.]+)s/);
        if (timeMatch) {
          processingTime = parseFloat(timeMatch[1]);
        }

        const result: TranscriptionResult = {
          segments: [], // Gradio 后端不返回时间戳分段
          fullText: text,
          duration: data.duration || 0,
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
        shouldRetry: (err) => !isClientError(err),
        onRetry: (attempt, err) => {
          if (import.meta.env.DEV) {
            console.warn(`[ASR] 重试第 ${attempt} 次:`, err.message);
          }
        },
      },
    );
  }

  /** 健康检查，返回后端是否在线（用于前端状态提示） */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.endpoint}/`, {
        signal: AbortSignal.timeout(5000),
      });
      // Gradio 根路径返回 200 表示服务在线
      return res.ok;
    } catch {
      return false;
    }
  }
}
