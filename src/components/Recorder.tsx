import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRecorder } from '../hooks/useRecorder';
import { REC_CHANNELS, REC_SAMPLE_RATE } from '../utils/wav';
import { useToast } from './Toast';
import AudioPlayer from './AudioPlayer';

interface RecorderProps {
  /** 是否禁用（转写进行中时不允许录音） */
  disabled: boolean;
  /** 录音完成 → 产出 WAV File，交给转写流程 */
  onRecorded: (file: File) => void;
  /** 录音完成后的音频文件（仅在线录音来源时用于回放） */
  recordedFile?: File | null;
}

/** 波形柱条数量（奇数让中心对称更精确） */
const BAR_COUNT = 45;

/** 中心最高、两侧渐低的包络（0~1） */
function barEnvelope(i: number): number {
  const dist = Math.abs(i - (BAR_COUNT - 1) / 2) / ((BAR_COUNT - 1) / 2);
  return Math.pow(1 - dist, 1.35);
}

/** hh:mm:ss 计时（贴合参考设计的大号时间） */
function formatTimer(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * 在线录音组件
 * 单屏、单按钮的录音台：状态标签 + 规格标识 + 中心对称波形 +
 * 大号计时 + 发光录音按钮 + 电平条。停止后编码为 WAV 送入转写流程。
 * 配色沿用整体暖灰系统，红色只用于状态点与录音按钮，克制而高级。
 */
export default function Recorder({ disabled, onRecorded, recordedFile }: RecorderProps) {
  const { status, duration, level, start, stop, cancel } = useRecorder();
  const { showToast } = useToast();
  const [audioURL, setAudioURL] = useState<string | null>(null);

  const isRecording = status === 'recording';
  const isRequesting = status === 'requesting';
  const isBlocked = status === 'denied' || status === 'unsupported';
  const canToggle = !disabled && !isRequesting && !isBlocked;

  // 为回放文件创建 / 释放 URL
  useEffect(() => {
    if (recordedFile) {
      const url = URL.createObjectURL(recordedFile);
      setAudioURL(url);
      return () => URL.revokeObjectURL(url);
    }
    setAudioURL(null);
  }, [recordedFile]);

  const handleToggle = async () => {
    if (isRecording) {
      const file = await stop();
      if (file) {
        showToast('录音完成', 'success');
        onRecorded(file);
      } else {
        showToast('录音失败', 'error');
      }
      return;
    }
    if (canToggle) await start();
  };

  // 取消录音并重置状态
  const handleCancel = () => {
    cancel();
    // 清理播放URL，确保状态完全初始化
    setAudioURL(null);
  };

  const statusLabel = isRecording
    ? '录音中'
    : isRequesting
      ? '连接中'
      : status === 'denied'
        ? '权限被拒'
        : status === 'unsupported'
          ? '不支持'
          : '准备就绪';

  const helperText = isRecording
    ? '停止并转写'
    : isRequesting
      ? '正在申请权限'
      : status === 'denied'
        ? '请允许麦克风访问'
        : status === 'unsupported'
          ? '请使用现代浏览器'
          : '开始录音';

  return (
    <div className="card flex min-h-[360px] flex-col">
      {/* 顶部：状态 + 规格标识 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-danger"
              animate={isRecording ? { opacity: [1, 0.25, 1] } : { opacity: 1 }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            />
            <span
              className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
                isRecording ? 'text-danger' : 'text-subtle'
              }`}
            >
              {statusLabel}
            </span>
          </div>
          <h3 className="mt-1 text-lg font-semibold text-ink">在线录音</h3>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <SpecPill>{REC_SAMPLE_RATE / 1000}kHz</SpecPill>
          <SpecPill>{REC_CHANNELS === 1 ? '单声道' : '立体声'}</SpecPill>
        </div>
      </div>

      {/* 录音台主体 */}
      <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-2xl bg-canvas px-6 py-8">
        {/* 中心对称波形 */}
        <motion.div
          className="flex h-20 w-full max-w-sm items-center justify-center gap-[3px]"
          animate={isRecording ? { opacity: 1 } : { opacity: [0.65, 1, 0.65] }}
          transition={
            isRecording
              ? { duration: 0.2 }
              : { repeat: Infinity, duration: 3.2, ease: 'easeInOut' }
          }
        >
          {Array.from({ length: BAR_COUNT }).map((_, i) => {
            const env = barEnvelope(i);
            let scaleY: number;
            if (isRecording) {
              const jitter = 0.72 + Math.random() * 0.28;
              scaleY = Math.max(0.05, Math.min(1, env * (0.18 + level * 2.4) * jitter));
            } else {
              // 待机：一条静态、优雅的对称波形
              scaleY = 0.06 + env * 0.18;
            }
            const opacity = isRecording
              ? Math.min(0.85, 0.28 + scaleY * 0.5)
              : 0.14 + env * 0.14;
            return (
              <motion.span
                key={i}
                className="w-[3px] rounded-full bg-ink"
                style={{ height: 80, transformOrigin: 'center', willChange: 'transform' }}
                animate={{ scaleY, opacity }}
                transition={{ duration: isRecording ? 0.12 : 0.7, ease: 'easeOut' }}
              />
            );
          })}
        </motion.div>

        {/* 大号计时 */}
        <div className="mt-6 text-center">
          <div className="font-mono text-5xl font-semibold tabular-nums tracking-tight text-ink">
            {formatTimer(duration)}
          </div>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.22em] text-subtle">
            已录制时长
          </p>
        </div>

        {/* 发光录音按钮 + 简洁操作提示 */}
        <div className="mt-8 flex flex-col items-center gap-6">
          <motion.button
            onClick={handleToggle}
            disabled={!canToggle && !isRecording}
            whileTap={canToggle || isRecording ? { scale: 0.96 } : undefined}
            className="group relative flex h-20 w-20 items-center justify-center rounded-full outline-none disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={isRecording ? '停止并转写' : '开始录音'}
          >
            {/* 录音时向外扩散的光环 */}
            {isRecording && (
              <motion.span
                className="absolute inset-0 rounded-full bg-danger/20"
                animate={{ scale: [1, 1.35], opacity: [0.45, 0] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeOut' }}
              />
            )}
            {/* 核心按钮 */}
            <motion.span
              animate={isRecording ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              className={`flex h-full w-full items-center justify-center rounded-full bg-danger text-white transition-shadow ${
                isRecording
                  ? 'shadow-[0_0_32px_rgba(255,59,48,0.4)]'
                  : 'shadow-[0_4px_16px_rgba(255,59,48,0.3)] group-hover:shadow-[0_6px_20px_rgba(255,59,48,0.35)]'
              }`}
            >
              {isRecording ? (
                <span className="h-4 w-4 rounded-[3px] bg-white" />
              ) : (
                <span className="h-5 w-5 rounded-full border-[2.5px] border-white" />
              )}
            </motion.span>
          </motion.button>

          {/* 状态提示（仅在异常状态或录音时显示操作提示） */}
          {(status === 'denied' || status === 'unsupported' || isRecording) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-1.5"
            >
              <p
                className={`text-sm font-medium ${
                  status === 'denied' || status === 'unsupported' ? 'text-danger' : 'text-body'
                }`}
              >
                {helperText}
              </p>
              {isRecording && (
                <button
                  onClick={handleCancel}
                  className="text-xs font-medium text-subtle transition-colors hover:text-danger"
                >
                  取消录音
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* 录音完成回放：圆环播放按钮 + 文件名同排 */}
      {audioURL && recordedFile && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl bg-canvas/60 p-3.5 border border-divider/50"
        >
          <AudioPlayer src={audioURL} fileName={recordedFile.name} />
        </motion.div>
      )}
    </div>
  );
}

/** 规格标识胶囊 */
function SpecPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-divider bg-white/70 px-2.5 py-1 text-[11px] font-medium tracking-wide text-subtle">
      {children}
    </span>
  );
}
