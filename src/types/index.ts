/**
 * 全局 TypeScript 类型定义
 * 集中管理所有跨模块共享的类型，保证类型一致性。
 */

/** 单个转写片段（带时间戳） */
export interface TranscriptionSegment {
  /** 片段文本 */
  text: string;
  /** 开始时间（秒） */
  startTime: number;
  /** 结束时间（秒） */
  endTime: number;
}

/** 完整的转写结果 */
export interface TranscriptionResult {
  /** 分段结果（用于生成 SRT 字幕），可选 - 如果 ASR 引擎不支持时间戳则为空数组 */
  segments: TranscriptionSegment[];
  /** 完整文本（用于编辑区展示与 TXT 导出） */
  fullText: string;
  /** 音频总时长（秒） */
  duration: number;
  /** 转写统计信息（可选） */
  stats?: TranscriptionStats;
}

/** 转写过程统计信息 */
export interface TranscriptionStats {
  /** 平均置信度 0~1 */
  confidence?: number;
  /** 处理耗时（秒） */
  processingTime?: number;
  /** 网络上传速率（字节/秒） */
  uploadSpeed?: number;
}

/** 上传文件的元信息 */
export interface AudioFileMeta {
  /** 文件名 */
  name: string;
  /** 文件大小（字节） */
  size: number;
  /** 时长（秒），可能为 undefined（解码失败时） */
  duration?: number;
  /** MIME 类型 */
  type: string;
}

/** 历史记录条目 */
export interface HistoryRecord {
  /** 唯一 ID */
  id: string;
  /** 文件名 */
  fileName: string;
  /** 转写时间（ISO 字符串） */
  createdAt: string;
  /** 文本预览（前 50 字） */
  preview: string;
  /** 完整转写结果（用于重新加载到编辑区） */
  result: TranscriptionResult;
  /** 音频数据（base64编码，用于历史记录播放） */
  audioData?: {
    data: string;
    type: string;
    size: number;
  };
}

/**
 * 上传 / 转写流程的状态机
 * idle → validating → ready →（用户确认）→ transcribing → success | error
 */
export type TranscribeStatus =
  | 'idle'
  | 'validating'
  | 'ready' // 文件已就绪，等待用户点击"开始转写"
  | 'transcribing'
  | 'success'
  | 'error';

/**
 * 转写模式
 * - fast：Conformer引擎，实时响应（~0.05秒，CER ~29%）
 * - accurate：FunASR引擎，高精度识别（~1秒，CER ~5-10%，提升80%准确率）
 */
export type TranscribeMode = 'fast' | 'accurate';

/** 队列中的单个文件转写任务 */
export interface QueueItem {
  /** 唯一 ID */
  id: string;
  /** 原始文件 */
  file: File;
  /** 文件名 */
  fileName: string;
  /** 任务状态 */
  status: 'pending' | 'processing' | 'done' | 'error';
  /** 转写结果（done 后存在） */
  result?: TranscriptionResult;
  /** 编辑区文本（可独立编辑每个文件的结果） */
  editedText: string;
  /** 错误信息 */
  errorMsg?: string;
}

/** 单次队列转写进度（0~1），用于当前 processing 项 */
export type QueueProgress = number;

/** Toast 提示类型 */
export type ToastType = 'success' | 'error' | 'info';

/** Toast 消息 */
export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}
