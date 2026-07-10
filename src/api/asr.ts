/**
 * ASR（自动语音识别）接口层
 * =====================================================================
 * 本文件封装所有与语音识别相关的接口。当前为 Mock 实现，
 * 通过统一的 `ASRService` 接口对外暴露，方便后续无缝替换为真实引擎。
 *
 * TODO: 接入真实 ASR 引擎时的替换步骤
 *   1. 实现 RealASRService 类（见文件底部示例），使其 implements ASRService。
 *   2. 修改接口调用逻辑（真实场景可能需要处理 WebSocket 流式返回、
 *      分片上传、鉴权 token、进度回调等）。
 *   3. 将底部的 `asrService` 导出改为 `new RealASRService(...)`。
 *   4. 确保真实 API 的响应能映射为 TranscriptionResult 接口结构。
 * =====================================================================
 */

import type { TranscribeMode, TranscriptionResult } from '../types';

/** 转写进度回调（0 ~ 1） */
export type ProgressCallback = (progress: number) => void;

/** 转写可选参数（为真实引擎预留扩展位） */
export interface TranscribeOptions {
  /** 进度回调 */
  onProgress?: ProgressCallback;
  /** 语言（预留，如 'zh' / 'en'） */
  language?: string;
  /** 取消信号（预留，真实请求可用于中断） */
  signal?: AbortSignal;
  /**
   * 转写模式：'fast'（Conformer，实时）或 'accurate'（FunASR，高精度）。
   * 映射为 Gradio 后端的模式参数（"快速模式 (Conformer)" / "高精度模式 (FunASR)"）。
   */
  mode?: TranscribeMode;
}

/**
 * ASR 服务统一接口
 * 所有实现（Mock / 真实）都必须遵循此契约。
 */
export interface ASRService {
  /**
   * 上传音频并转写为文字。
   * @param file 音频文件
   * @param options 可选参数（进度、语言、取消等）
   * @returns 转写结果
   */
  uploadAndTranscribe(
    file: File,
    options?: TranscribeOptions,
  ): Promise<TranscriptionResult>;
}

// ---------------------------------------------------------------------------
// Mock 实现（现阶段）
// ---------------------------------------------------------------------------

/** Mock 转写文案库：拼装成一段有真实感的会议 / 播客转写稿 */
const MOCK_SENTENCES: string[] = [
  '大家好，欢迎收听本期节目，今天我们聊聊人工智能在日常生活中的应用。',
  '首先，语音识别技术这几年进步非常快，准确率已经能满足大部分办公场景。',
  '很多团队会用它来做会议纪要，把长达一小时的录音在几分钟内转成文字。',
  '不过，转写结果通常还需要人工校对，尤其是专有名词和多人对话的场景。',
  '这也是为什么我们在产品里同时提供了转写和在线编辑功能。',
  '你可以直接在文本框里修改错别字，调整段落，然后一键导出。',
  '导出格式支持纯文本 TXT，也支持带时间戳的 SRT 字幕文件。',
  '如果你做视频剪辑，SRT 字幕可以直接拖进剪辑软件里使用，非常方便。',
  '好，这就是今天的分享，我们下期再见，记得点赞和收藏。',
];

/**
 * MockASRService
 * 模拟真实的上传 + 转写延迟，并返回结构化的示例数据。
 */
export class MockASRService implements ASRService {
  async uploadAndTranscribe(
    file: File,
    options: TranscribeOptions = {},
  ): Promise<TranscriptionResult> {
    const { onProgress } = options;

    // 模拟总耗时 2 ~ 3 秒，期间平滑上报进度
    const totalMs = 2000 + Math.random() * 1000;
    await this.simulateProgress(totalMs, onProgress);

    return this.generateMockResult(file);
  }

  /** 分步推进进度，营造真实的加载观感 */
  private simulateProgress(
    totalMs: number,
    onProgress?: ProgressCallback,
  ): Promise<void> {
    return new Promise((resolve) => {
      const steps = 20;
      const interval = totalMs / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += 1;
        onProgress?.(Math.min(current / steps, 1));
        if (current >= steps) {
          clearInterval(timer);
          resolve();
        }
      }, interval);
    });
  }

  /** 根据文件生成示例转写结果（当前仅支持纯文本，不支持时间戳分段） */
  private generateMockResult(file: File): TranscriptionResult {
    // 当前 ASR 引擎仅支持纯文本输出，不支持时间戳分段
    const fullText = MOCK_SENTENCES.join('\n');
    const header = `【转写来源：${file.name}】\n\n`;

    return {
      segments: [], // 暂不支持时间戳分段，SRT 导出功能已禁用
      fullText: header + fullText,
      duration: 0, // 实际接入时从音频元信息获取
    };
  }
}

// ---------------------------------------------------------------------------
// 真实实现示例（占位，未启用）
// ---------------------------------------------------------------------------
/*
export class RealASRService implements ASRService {
  constructor(private readonly apiKey: string, private readonly endpoint: string) {}

  async uploadAndTranscribe(
    file: File,
    options: TranscribeOptions = {},
  ): Promise<TranscriptionResult> {
    const form = new FormData();
    form.append('audio', file);

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
      signal: options.signal,
    });
    if (!res.ok) throw new Error(`ASR 请求失败：${res.status}`);

    const data = await res.json();
    // TODO: 将真实响应映射为 TranscriptionResult
    return {
      segments: data.segments,
      fullText: data.text,
      duration: data.duration,
    };
  }
}
*/

// ---------------------------------------------------------------------------
// 当前使用的服务实例（切换真实引擎时仅需修改此处）
// ---------------------------------------------------------------------------
import { RealASRService } from './realASR';

/** ASR 服务后端地址（通过环境变量配置，默认 Modal 部署地址） */
export const ASR_ENDPOINT = import.meta.env.VITE_ASR_ENDPOINT || 'https://le0609--chinese-asr-serve.modal.run';

export const asrService = new RealASRService(ASR_ENDPOINT);

