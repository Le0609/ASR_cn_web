/**
 * 录音工具：通过 Web Audio API 采集麦克风，重采样为
 * 16kHz / 16bit / 单声道 PCM，并编码为标准 WAV 文件。
 *
 * 为什么不用 MediaRecorder：
 *   MediaRecorder 输出的是 webm/ogg（Opus 编码），采样率、位深不可控，
 *   且多数 ASR 引擎更偏好 16k/16bit/mono 的 PCM WAV。这里用 AudioContext
 *   + ScriptProcessor/AnalyserNode 手动采集原始 PCM，保证输出规格可控。
 */

/** 目标录音规格 */
export const REC_SAMPLE_RATE = 16000; // 16kHz
export const REC_BIT_DEPTH = 16; // 16bit
export const REC_CHANNELS = 1; // 单声道

/**
 * 将 Float32 PCM 数据（-1~1）线性重采样到目标采样率，
 * 再编码为 16bit 小端 PCM 的 WAV Blob。
 */
export function encodeWav(
  float32: Float32Array,
  inputSampleRate: number,
): Blob {
  // 1. 重采样到 16kHz
  const resampled =
    inputSampleRate === REC_SAMPLE_RATE
      ? float32
      : resample(float32, inputSampleRate, REC_SAMPLE_RATE);

  // 2. Float32 → Int16
  const pcm16 = floatTo16BitPCM(resampled);

  // 3. 拼装 WAV（44 字节头 + PCM 数据）
  return buildWavBlob(pcm16, REC_SAMPLE_RATE, REC_CHANNELS);
}

/** 线性插值重采样 */
function resample(
  input: Float32Array,
  inRate: number,
  outRate: number,
): Float32Array {
  const ratio = inRate / outRate;
  const outLength = Math.round(input.length / ratio);
  const output = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = input[idx] ?? 0;
    const b = input[idx + 1] ?? a;
    output[i] = a + (b - a) * frac; // 线性插值
  }
  return output;
}

/** Float32（-1~1）转 16bit 有符号整数 */
function floatTo16BitPCM(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** 组装标准 WAV 文件（PCM 编码） */
function buildWavBlob(
  pcm16: Int16Array,
  sampleRate: number,
  channels: number,
): Blob {
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm16.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, 1, true); // PCM 格式
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, REC_BIT_DEPTH, true);
  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // 写入 PCM 数据（小端）
  let offset = 44;
  for (let i = 0; i < pcm16.length; i++) {
    view.setInt16(offset, pcm16[i], true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}
