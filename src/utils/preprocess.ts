/**
 * 音频预处理工具：音量归一化、降噪、格式转换
 * 使用 Web Audio API 实现，无需后端依赖
 */

import { encodeWav } from './wav';

/** 预处理配置 */
export interface PreprocessOptions {
  /** 目标采样率（Hz，默认 16000） */
  targetSampleRate?: number;
  /** 是否启用音量归一化（默认 true） */
  normalize?: boolean;
  /** 归一化目标峰值（0~1，默认 0.95） */
  normalizeTarget?: number;
  /** 是否启用降噪（默认 false，实验性功能） */
  denoise?: boolean;
  /** 进度回调 */
  onProgress?: (progress: number) => void;
}

/**
 * 预处理音频文件
 * @param file 原始音频文件
 * @param options 预处理配置
 * @returns 处理后的 WAV 文件
 */
export async function preprocessAudio(
  file: File,
  options: PreprocessOptions = {},
): Promise<File> {
  const {
    targetSampleRate = 16000,
    normalize = true,
    normalizeTarget = 0.95,
    denoise = false,
    onProgress,
  } = options;

  onProgress?.(0.1);

  // 1. 解码音频文件为 AudioBuffer
  const audioBuffer = await decodeAudioFile(file);
  onProgress?.(0.3);

  // 2. 重采样到目标采样率
  const resampled = await resampleAudioBuffer(audioBuffer, targetSampleRate);
  onProgress?.(0.5);

  // 3. 转为单声道
  const mono = convertToMono(resampled);
  onProgress?.(0.6);

  // 4. 音量归一化
  let processed = mono;
  if (normalize) {
    processed = normalizeVolume(processed, normalizeTarget);
  }
  onProgress?.(0.7);

  // 5. 降噪（可选，实验性）
  if (denoise) {
    processed = applySimpleDenoise(processed);
  }
  onProgress?.(0.9);

  // 6. 编码为 WAV
  const wavBlob = encodeWav(processed, targetSampleRate);
  onProgress?.(1.0);

  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([wavBlob], `${baseName}_processed.wav`, { type: 'audio/wav' });
}

/**
 * 解码音频文件为 AudioBuffer
 */
async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();

  // 使用离线上下文避免影响实时播放
  const offlineCtx = new OfflineAudioContext(2, 44100 * 2, 44100);

  try {
    return await offlineCtx.decodeAudioData(arrayBuffer);
  } catch (error) {
    throw new Error(`音频解码失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 重采样 AudioBuffer 到目标采样率
 */
async function resampleAudioBuffer(
  buffer: AudioBuffer,
  targetSampleRate: number,
): Promise<AudioBuffer> {
  if (buffer.sampleRate === targetSampleRate) {
    return buffer;
  }

  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    Math.ceil(buffer.duration * targetSampleRate),
    targetSampleRate,
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  return await offlineCtx.startRendering();
}

/**
 * 转为单声道（混音多声道）
 */
function convertToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0);
  }

  const length = buffer.length;
  const mono = new Float32Array(length);
  const channels = buffer.numberOfChannels;

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let ch = 0; ch < channels; ch++) {
      sum += buffer.getChannelData(ch)[i];
    }
    mono[i] = sum / channels;
  }

  return mono;
}

/**
 * 音量归一化（峰值归一化）
 */
function normalizeVolume(samples: Float32Array, targetPeak: number): Float32Array {
  // 找出当前峰值
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }

  // 避免除零
  if (peak < 0.001) return samples;

  // 计算增益
  const gain = targetPeak / peak;

  // 应用增益
  const normalized = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    normalized[i] = Math.max(-1, Math.min(1, samples[i] * gain));
  }

  return normalized;
}

/**
 * 简单降噪（高通滤波器，去除低频噪声）
 * 注意：这是非常简化的实现，真正的降噪需要复杂算法（如谱减法）
 */
function applySimpleDenoise(samples: Float32Array): Float32Array {
  const denoised = new Float32Array(samples.length);

  // 简单高通滤波器（一阶差分）
  denoised[0] = samples[0];
  for (let i = 1; i < samples.length; i++) {
    const alpha = 0.95; // 高通滤波系数
    denoised[i] = alpha * (denoised[i - 1] + samples[i] - samples[i - 1]);
  }

  return denoised;
}

/**
 * 检测音频是否需要预处理
 */
export function shouldPreprocess(file: File): boolean {
  // 如果已经是 WAV 且不太大，可能不需要预处理
  const isWav = file.name.toLowerCase().endsWith('.wav') || file.type === 'audio/wav';
  const isSmall = file.size < 5 * 1024 * 1024; // 5MB

  // 非 WAV 或较大文件建议预处理
  return !isWav || !isSmall;
}
