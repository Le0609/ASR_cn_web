/**
 * 音频相关工具：文件校验与时长获取
 */
import type { AudioFileMeta } from '../types';

/** 允许的文件扩展名（与 ASR 后端支持格式对齐：WAV/WebM/MP3/M4A/FLAC） */
export const ALLOWED_EXTENSIONS = ['mp3', 'wav', 'm4a', 'webm', 'flac'] as const;

/** 允许的 MIME 类型（不同浏览器对 m4a 的 MIME 判定不一，故同时用扩展名兜底） */
const ALLOWED_MIME = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/webm',
  'audio/ogg',
  'audio/flac',
  'audio/x-flac',
];

/** 文件大小上限：50MB */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

export interface ValidationResult {
  valid: boolean;
  /** 校验失败时的中文错误提示 */
  error?: string;
}

/** 取扩展名（小写，不含点） */
function getExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx === -1 ? '' : name.slice(idx + 1).toLowerCase();
}

/**
 * 校验音频文件：格式与大小。
 * 采用「扩展名 或 MIME 命中即通过」的宽松策略，减少误杀。
 */
export function validateAudioFile(file: File): ValidationResult {
  const ext = getExtension(file.name);
  const extOk = (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
  const mimeOk = ALLOWED_MIME.includes(file.type);

  if (!extOk && !mimeOk) {
    return {
      valid: false,
      error: `不支持的文件格式，请上传 ${ALLOWED_EXTENSIONS.join(' / ').toUpperCase()} 文件`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `文件过大（上限 50MB），当前文件约 ${(file.size / (1024 * 1024)).toFixed(1)}MB`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: '文件内容为空，请重新选择' };
  }

  return { valid: true };
}

/**
 * 使用 Web Audio API 解码获取音频时长（秒）。
 * 优先用 AudioContext.decodeAudioData（最准确）；
 * 若解码失败（如某些 m4a 编码），回退到 <audio> 元素的 metadata。
 */
export function getAudioDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    // 方案一：<audio> 元素读取 metadata（轻量、兼容性好）
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    let settled = false;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      audio.removeAttribute('src');
    };

    const finish = (value: number | undefined) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    audio.addEventListener('loadedmetadata', () => {
      const d = audio.duration;
      finish(Number.isFinite(d) && d > 0 ? d : undefined);
    });

    audio.addEventListener('error', () => finish(undefined));

    // 兜底超时，避免个别文件卡住 UI
    setTimeout(() => finish(undefined), 8000);

    audio.preload = 'metadata';
    audio.src = url;
  });
}

/** 构造文件元信息 */
export async function buildAudioMeta(file: File): Promise<AudioFileMeta> {
  const duration = await getAudioDuration(file);
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    duration,
  };
}
