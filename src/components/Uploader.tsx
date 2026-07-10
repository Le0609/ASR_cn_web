import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { AudioFileMeta, QueueItem, TranscribeStatus } from '../types';
import { ALLOWED_EXTENSIONS, validateAudioFile } from '../utils/audio';
import { formatFileSize } from '../utils/format';
import { easeApple } from '../utils/motion';
import ProgressBar from './ProgressBar';
import AudioPlayer from './AudioPlayer';

interface UploaderProps {
  status: TranscribeStatus;
  /** 当前处理中的文件元信息 */
  fileMeta: AudioFileMeta | null;
  /** 当前文件转写进度 0~1 */
  progress: number;
  /** 错误信息 */
  error: string | null;
  /** 多文件队列（长度 > 0 时进入队列展示） */
  queue?: QueueItem[];
  /** 当前正在处理的队列项索引 */
  activeQueueIdx?: number;
  /** 当前队列项转写进度 0~1 */
  queueProgress?: number;
  /**
   * 选择到合法文件后回调（支持多文件）
   * 单文件时数组长度为 1（录音场景）
   */
  onFilesSelected: (files: File[], append?: boolean) => void;
  /** 校验失败回调 */
  onValidationError: (message: string) => void;
  /** 从队列移除某个文件（转写开始前可用） */
  onRemoveQueueItem?: (id: string) => void;
  /** 切换活跃队列项（用于预览不同文件） */
  onSetActiveQueueIdx?: (index: number) => void;
  /** 重置到初始态 */
  onReset: () => void;
  /** 当前活跃文件（用于播放器预览） */
  currentFile?: File | null;
}

/**
 * 上传组件
 * 支持点击与拖拽两种方式，具备完整状态反馈：
 * hover / dragging / validating / transcribing / success / error。
 */
export default function Uploader({
  status,
  fileMeta,
  progress,
  error,
  queue = [],
  activeQueueIdx = 0,
  queueProgress = 0,
  onFilesSelected,
  onValidationError,
  onRemoveQueueItem,
  onSetActiveQueueIdx,
  onReset,
  currentFile,
}: UploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isAppendMode, setIsAppendMode] = useState(false); // 是否为追加模式
  const dragCounter = useRef(0);

  const isBusy = status === 'validating' || status === 'transcribing';
  const isQueueMode = queue.length > 0;
  /** 队列中已完成的文件数（用于总览进度） */
  const doneCount = queue.filter((q) => q.status === 'done').length;

  // 为当前活跃的文件创建播放URL（支持队列模式）
  useEffect(() => {
    if (isQueueMode && queue[activeQueueIdx]?.file) {
      const url = URL.createObjectURL(queue[activeQueueIdx].file);
      setAudioURL(url);
      return () => URL.revokeObjectURL(url);
    } else if (currentFile) {
      const url = URL.createObjectURL(currentFile);
      setAudioURL(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioURL(null);
    }
  }, [currentFile, isQueueMode, queue, activeQueueIdx]);

  /** 校验并收集多个文件，通知父组件 */
  const handleFiles = useCallback(
    (rawFiles: FileList | File[]) => {
      const arr = Array.from(rawFiles);
      const valid: File[] = [];
      for (const f of arr) {
        const res = validateAudioFile(f);
        if (!res.valid) {
          onValidationError(`${f.name}：${res.error ?? '格式不支持'}`);
        } else {
          valid.push(f);
        }
      }
      if (valid.length > 0) onFilesSelected(valid, isAppendMode);
      setIsAppendMode(false); // 重置追加模式
    },
    [onFilesSelected, onValidationError, isAppendMode],
  );

  const openPicker = (append = false) => {
    if (isBusy) return;
    setIsAppendMode(append);
    inputRef.current?.click();
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    e.target.value = '';
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (isBusy) return;
    dragCounter.current += 1;
    setIsDragging(true);
  };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) { dragCounter.current = 0; setIsDragging(false); }
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (isBusy) return;
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="card min-h-[360px] overflow-hidden">
      {/* 隐藏的原生 input */}
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,.m4a,.webm,.flac,audio/*"
        multiple
        className="hidden"
        onChange={onInputChange}
      />

      <AnimatePresence mode="wait">
        {/* ---------- 空闲 / 错误：展示拖拽区 ---------- */}
        {(status === 'idle' || status === 'error') && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              role="button"
              tabIndex={0}
              aria-label="上传音频文件"
              onClick={() => openPicker(false)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openPicker(false)}
              onDragEnter={onDragEnter}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              animate={{
                borderColor: isDragging ? '#1d1d1f' : '#D2D2D7',
                backgroundColor: isDragging ? 'rgba(29,29,31,0.04)' : 'rgba(247,246,243,0.5)',
                scale: isDragging ? 1.01 : 1,
              }}
              transition={{ duration: 0.2, ease: easeApple }}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
            >
              {/* 上传图标：深灰（去蓝化） */}
              <motion.div
                animate={{ y: isDragging ? -6 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink/[0.06]"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 16V4m0 0L7 9m5-5l5 5"
                    stroke="#1d1d1f"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3"
                    stroke="#1d1d1f"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </motion.div>

              <p className="text-lg font-semibold text-ink">
                {isDragging ? '松开以上传' : '拖拽音频到这里，或点击选择'}
              </p>
              <p className="mt-2 text-sm text-subtle">
                支持 {ALLOWED_EXTENSIONS.join(' / ').toUpperCase()} · 单文件最大 50MB
              </p>
              <p className="mt-1 text-xs text-subtle/60">可同时选择多个文件批量转写</p>

              {/* 错误提示 */}
              <AnimatePresence>
                {status === 'error' && error && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger"
                  >
                    <span>⚠</span>
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}

        {/* ---------- 多文件队列：文件列表 ---------- */}
        {(status === 'ready' ||
          status === 'transcribing' ||
          status === 'success') &&
          isQueueMode && (
            <motion.div
              key="queuelist"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: easeApple }}
            >
              {/* 头部：标题 + 进度概览 + 操作 */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-ink">待转写文件</h3>
                    <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-xs font-medium tabular-nums text-body">
                      {queue.length}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-subtle">
                    {doneCount > 0
                      ? `已完成 ${doneCount} / ${queue.length}`
                      : status === 'transcribing'
                        ? '正在依次转写…'
                        : '确认后将按顺序转写'}
                  </p>
                </div>
                {(status === 'success' || status === 'ready') && (
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => openPicker(true)} className="btn-ghost text-xs" aria-label="继续上传">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      继续上传
                    </button>
                    <button onClick={onReset} className="btn-ghost text-xs !text-subtle" aria-label="重置">
                      重置
                    </button>
                  </div>
                )}
              </div>

              {/* 完成进度总览条（多文件时） */}
              {queue.length > 1 && (
                <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-black/[0.05]">
                  <motion.div
                    className="h-full rounded-full bg-ink"
                    initial={false}
                    animate={{ width: `${(doneCount / queue.length) * 100}%` }}
                    transition={{ duration: 0.4, ease: easeApple }}
                  />
                </div>
              )}

              {/* 紧凑文件列表：默认展示约 4.5 行，超出滚动查看 */}
              <div className="scroll-slim -mr-1 max-h-[400px] space-y-3 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {queue.map((item, idx) => {
                    const active = idx === activeQueueIdx && status === 'transcribing';
                    const isViewing = idx === activeQueueIdx && status === 'success';
                    const isPending = item.status === 'pending';
                    const isError = item.status === 'error';

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.2, ease: easeApple }}
                        className="space-y-2"
                      >
                        {/* 文件信息卡片（可点击切换） */}
                        <div
                          onClick={() => {
                            // 转写中禁止切换，其他状态允许切换查看
                            if (status !== 'transcribing' && onSetActiveQueueIdx) {
                              onSetActiveQueueIdx(idx);
                            }
                          }}
                          className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 transition-all ${
                            status !== 'transcribing' ? 'cursor-pointer' : ''
                          } ${
                            active
                              ? 'border-ink/25 bg-ink/[0.03] shadow-sm'
                              : isViewing
                                ? 'border-ink/15 bg-ink/[0.02]'
                                : isError
                                  ? 'border-danger/25 bg-danger/[0.02]'
                                  : 'border-divider bg-white/70 hover:border-ink/15 hover:bg-white'
                          }`}
                        >
                          {/* 播放按钮：所有状态都显示，让用户随时可以预览音频 */}
                          <QueueItemPlayer file={item.file} fileName={item.fileName} fileSize={item.file.size} />

                          {/* 状态标签 + 操作按钮（右侧区域） */}
                          <div className="flex shrink-0 items-center gap-2">
                            {/* 处理中：实时百分比 */}
                            {active && (
                              <span className="text-xs font-semibold tabular-nums text-ink">
                                {Math.round(queueProgress * 100)}%
                              </span>
                            )}

                            {/* 状态图标或移除按钮 */}
                            {isPending && onRemoveQueueItem ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveQueueItem(item.id);
                                }}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-subtle/60 transition-all hover:bg-danger/10 hover:text-danger"
                                aria-label={`移除 ${item.fileName}`}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                  <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                              </button>
                            ) : (
                              <div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
                                <QueueItemStatusIcon status={item.status} />
                              </div>
                            )}
                          </div>

                          {/* 转写进度条（仅当前处理项，底部细线） */}
                          {active && (
                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/[0.05]">
                              <motion.div
                                className="h-full bg-ink"
                                initial={{ width: 0 }}
                                animate={{ width: `${queueProgress * 100}%` }}
                                transition={{ duration: 0.2, ease: 'linear' }}
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* 列表可滚动提示（超过 5 个文件时） */}
              {queue.length > 5 && (
                <p className="mt-2 text-center text-[11px] text-subtle/70">
                  向下滚动查看全部 {queue.length} 个文件
                </p>
              )}
            </motion.div>
          )}

        {/* ---------- 校验中 / 就绪 / 转写中 / 成功：展示文件卡片（单文件） ---------- */}
        {(status === 'validating' ||
          status === 'ready' ||
          status === 'transcribing' ||
          status === 'success') &&
          !isQueueMode &&
          fileMeta && (
            <motion.div
              key="fileinfo"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: easeApple }}
            >
              <div className="rounded-2xl bg-canvas p-4">
                <div className="flex items-center gap-4">
                  {audioURL ? (
                    /* 音频就绪：圆环播放按钮 + 文件名 + 时间，同排展示 */
                    <AudioPlayer
                      src={audioURL}
                      fileName={fileMeta.name}
                      meta={formatFileSize(fileMeta.size)}
                      className="min-w-0 flex-1"
                    />
                  ) : (
                    <>
                      {/* 音频尚未就绪：读取中占位图标 */}
                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="block h-5 w-5 rounded-full border-2 border-ink/15 border-t-ink"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink" title={fileMeta.name}>
                          {fileMeta.name}
                        </p>
                        <p className="mt-0.5 text-sm text-subtle">{formatFileSize(fileMeta.size)}</p>
                      </div>
                    </>
                  )}

                  {/* 成功后提供继续上传和重置两个选项 */}
                  {status === 'success' && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => openPicker(true)}
                        className="btn-ghost shrink-0 text-xs"
                        aria-label="继续上传"
                      >
                        继续上传
                      </button>
                      <button
                        onClick={onReset}
                        className="btn-ghost shrink-0 text-xs"
                        aria-label="重置"
                      >
                        重置
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 转写进度条（Apple 风格：流动高光 + 实时进度） */}
              <AnimatePresence>
                {(status === 'validating' || status === 'transcribing') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-5 overflow-hidden"
                  >
                    <div className="mb-3 flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">
                        {status === 'validating' ? '正在读取文件' : '正在识别中'}
                      </span>
                      <span className="tabular-nums text-subtle">
                        {Math.round(progress * 100)}%
                      </span>
                    </div>
                    <ProgressBar value={progress} active={status === 'transcribing'} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}

/** 队列文件状态图标（紧凑版，仅图标无背景） */
function QueueItemStatusIcon({ status }: { status: QueueItem['status'] }) {
  if (status === 'processing') {
    return (
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="block h-4 w-4 rounded-full border-2 border-ink/20 border-t-ink"
      />
    );
  }
  if (status === 'done') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
        <path d="M5 12l5 5L20 7" />
      </svg>
    );
  }
  if (status === 'error') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-danger">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
    );
  }
  // pending：灰色空心圆点，表示待处理
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-subtle/40">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** 队列项音频播放器（圆环按钮 + 文件名同排） */
function QueueItemPlayer({ file, fileName, fileSize }: { file: File; fileName: string; fileSize: number }) {
  const [audioURL, setAudioURL] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setAudioURL(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!audioURL) return null;

  return (
    // 阻止冒泡：点击播放器不应触发外层卡片的"切换查看"
    <div onClick={(e) => e.stopPropagation()} className="min-w-0 flex-1">
      <AudioPlayer src={audioURL} fileName={fileName} meta={formatFileSize(fileSize)} size={32} />
    </div>
  );
}
