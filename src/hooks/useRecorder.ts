import { useCallback, useEffect, useRef, useState } from 'react';
import { encodeWav } from '../utils/wav';

/** 录音状态 */
export type RecordStatus =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'denied'
  | 'unsupported';

interface UseRecorderResult {
  status: RecordStatus;
  /** 已录制时长（秒） */
  duration: number;
  /** 实时输入电平（0~1），用于录音可视化 */
  level: number;
  /** 开始录音（申请麦克风） */
  start: () => Promise<void>;
  /** 停止录音，返回编码后的 WAV File（失败返回 null） */
  stop: () => Promise<File | null>;
  /** 取消录音，丢弃数据 */
  cancel: () => void;
}

/**
 * useRecorder
 * 通过 Web Audio API 采集麦克风原始 PCM，停止时编码为
 * 16kHz / 16bit / 单声道 WAV File，可直接送入现有转写流程。
 */
export function useRecorder(): UseRecorderResult {
  const [status, setStatus] = useState<RecordStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [level, setLevel] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  // 累积的 PCM 数据块
  const chunksRef = useRef<Float32Array[]>([]);
  const inputRateRef = useRef<number>(44100);
  const startTimeRef = useRef<number>(0);
  const durationTimerRef = useRef<number | null>(null);
  // 用 ref 跟踪当前状态，供卸载/关闭页面时读取，避免把 status 放进 effect 依赖
  const statusRef = useRef<RecordStatus>('idle');
  statusRef.current = status;

  /** 释放所有资源 */
  const teardown = useCallback(() => {
    if (durationTimerRef.current !== null) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      void ctxRef.current.close();
    }
    ctxRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') {
      setStatus('unsupported');
      return;
    }

    setStatus('requesting');
    chunksRef.current = [];
    setDuration(0);
    setLevel(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const ctx = new AudioContext();
      ctxRef.current = ctx;
      inputRateRef.current = ctx.sampleRate;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // ScriptProcessor 采集原始 PCM（虽已废弃，但兼容性最好、够用）
      const bufferSize = 4096;
      const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        // 拷贝一份（原 buffer 会被复用）
        chunksRef.current.push(new Float32Array(input));

        // 计算 RMS 电平用于可视化
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        const rms = Math.sqrt(sum / input.length);
        setLevel(Math.min(1, rms * 4));
      };

      source.connect(processor);
      processor.connect(ctx.destination); // 必须连到 destination 才会触发 onaudioprocess

      startTimeRef.current = Date.now();
      durationTimerRef.current = window.setInterval(() => {
        setDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);

      setStatus('recording');
    } catch (err) {
      console.warn('录音启动失败：', err);
      teardown();
      setStatus('denied');
    }
  }, [teardown]);

  const stop = useCallback(async (): Promise<File | null> => {
    if (status !== 'recording') return null;

    const inputRate = inputRateRef.current;
    const chunks = chunksRef.current;
    teardown();
    setStatus('idle');
    setLevel(0);

    if (chunks.length === 0) return null;

    // 合并所有 PCM 块
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    chunksRef.current = [];

    // 编码为 16k/16bit/mono WAV
    const blob = encodeWav(merged, inputRate);
    const fileName = `录音_${formatStamp()}.wav`;
    return new File([blob], fileName, { type: 'audio/wav' });
  }, [status, teardown]);

  const cancel = useCallback(() => {
    teardown();
    chunksRef.current = [];
    setStatus('idle');
    setDuration(0);
    setLevel(0);
  }, [teardown]);

  // 仅在组件真正卸载时释放一次（空依赖数组）。
  // 用 statusRef 读取最新状态，避免把 status 放进依赖导致每次状态变化都 teardown。
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (statusRef.current === 'recording') {
        teardown();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, duration, level, start, stop, cancel };
}

/** 生成文件名时间戳：MMDD_HHmmss */
function formatStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(
    d.getMinutes(),
  )}${p(d.getSeconds())}`;
}
