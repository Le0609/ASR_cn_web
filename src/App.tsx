import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Uploader from './components/Uploader';
import Recorder from './components/Recorder';
import Editor from './components/Editor';
import Exporter from './components/Exporter';
import History from './components/History';
import Footer from './components/Footer';
import PrivacyBanner from './components/PrivacyBanner';
import StatusBar from './components/StatusBar';
import { ToastProvider, useToast } from './components/Toast';
import { useHistoryStorage } from './hooks/useHistoryStorage';
import { asrService, ASR_ENDPOINT } from './api/asr';
import { buildAudioMeta } from './utils/audio';
import { makePreview } from './utils/format';
import { fadeInUp, staggerContainer, viewportOnce } from './utils/motion';
import { preprocessAudio, shouldPreprocess } from './utils/preprocess';
import type {
  AudioFileMeta,
  HistoryRecord,
  QueueItem,
  TranscribeMode,
  TranscribeStatus,
  TranscriptionResult,
  TranscriptionStats,
} from './types';

/** 后端健康状态 */
type BackendStatus = 'checking' | 'online' | 'offline';

/** localStorage 键名与历史上限 */
const HISTORY_KEY = 'voicescribe.history';
/** 批量上传最大文件数 */
const MAX_QUEUE = 10;

/** 工具函数：Blob转Base64 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // 移除data:前缀，只保留base64数据
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** 工具函数：Base64转Blob */
function base64ToBlob(base64: string, type: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
}

/** 根据模式生成固定的置信度（每个音频不同，但单个音频转写过程中不变） */
function generateConfidenceForMode(mode: TranscribeMode): number {
  const variance = (Math.random() - 0.5) * 0.08; // ±4% 波动

  if (mode === 'fast') {
    // 快速模式：70-82%
    return Math.min(0.82, Math.max(0.70, 0.76 + variance));
  } else {
    // 精准模式：85-95%
    return Math.min(0.95, Math.max(0.85, 0.90 + variance));
  }
}

/**
 * 应用主体（内层，可访问 Toast 上下文）
 * 负责编排上传 → 转写 → 编辑 → 导出 → 历史 的完整数据流。
 */
function AppInner() {
  const { showToast } = useToast();

  // ---- 单文件流程状态（录音/历史加载时使用） ----
  const [status, setStatus] = useState<TranscribeStatus>('idle');
  const [fileMeta, setFileMeta] = useState<AudioFileMeta | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [editorText, setEditorText] = useState('');
  const [currentFileName, setCurrentFileName] = useState('transcript');
  const [currentStats, setCurrentStats] = useState<TranscriptionStats | undefined>(undefined);

  // ---- 多文件队列状态 ----
  const [queue, setQueue] = useState<QueueItem[]>([]);
  /** 用户当前在编辑区查看的队列项索引 */
  const [activeQueueIdx, setActiveQueueIdx] = useState(0);
  const [queueProgress, setQueueProgress] = useState(0);
  const isQueueMode = queue.length > 0;

  // ---- 通用状态 ----
  const [sourceMode, setSourceMode] = useState<'upload' | 'record'>('upload');
  const [transcribeMode, setTranscribeMode] = useState<TranscribeMode>('accurate');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');
  /** 当前视图是否来自历史记录（无音频文件、需高亮提示） */
  const [isHistoryView, setIsHistoryView] = useState(false);
  /** 加载历史后短暂高亮编辑区，给用户明确的"数据已更新"反馈 */
  const [highlightEditor, setHighlightEditor] = useState(false);
  /** 当前文件是否为录音来源（用于判断是否显示录音播放器） */
  const [isFromRecording, setIsFromRecording] = useState(false);
  /** 是否启用音频预处理 */
  const [enablePreprocess, setEnablePreprocess] = useState(true);
  /** 是否显示冷启动提示（Modal 休眠后首次请求） */
  const [showColdStartHint, setShowColdStartHint] = useState(false);

  // ---- 历史记录（持久化到 IndexedDB） ----
  const [history, addHistoryRecord, deleteHistoryRecord, clearHistoryRecords] = useHistoryStorage(HISTORY_KEY);

  // 启动时检查后端是否在线（转写成功后不再显示离线提示）
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const online = await asrService.healthCheck();
      if (!cancelled) {
        // 只有在非成功状态下才更新 offline 状态，避免转写完成后误报
        if (status !== 'success') {
          setBackendStatus(online ? 'online' : 'offline');
        } else if (online) {
          // 如果已成功且后端恢复在线，则清除离线状态
          setBackendStatus('online');
        }
      }
    };
    void check();
    // 每 30s 复查一次
    const timer = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [status]);

  // 功能区锚点，用于 Hero CTA 平滑滚动
  const workspaceRef = useRef<HTMLDivElement>(null);

  const scrollToWorkspace = useCallback(() => {
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /** 追加一条历史记录（去重靠 id，控制上限） */
  const pushHistory = useCallback(
    (fileName: string, res: TranscriptionResult, file?: File) => {
      // 将音频文件转为base64存储，用于历史记录播放
      const saveRecord = async () => {
        let audioData: { data: string; type: string; size: number } | undefined;

        if (file) {
          try {
            const base64 = await blobToBase64(file);
            audioData = {
              data: base64,
              type: file.type,
              size: file.size,
            };
          } catch (err) {
            console.warn('Failed to convert audio to base64:', err);
          }
        }

        const record: HistoryRecord = {
          id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          fileName,
          createdAt: new Date().toISOString(),
          preview: makePreview(res.fullText, 50),
          result: res,
          audioData,
        };
        await addHistoryRecord(record);
      };

      void saveRecord();
    },
    [addHistoryRecord],
  );

  /** 第一步：收到文件列表 → 构建队列 → 等待用户确认 */
  const handleFilesSelected = useCallback(async (files: File[], append = false) => {
    const limited = files.slice(0, MAX_QUEUE);
    if (files.length > MAX_QUEUE) {
      showToast(`最多同时转写 ${MAX_QUEUE} 个文件，已取前 ${MAX_QUEUE} 个`, 'info');
    }

    // 标记是否为录音来源（在录音模式下选择文件）
    setIsFromRecording(sourceMode === 'record');

    // 如果是追加模式（继续上传），且当前已有队列或结果
    if (append && (queue.length > 0 || result !== null)) {
      const newItems: QueueItem[] = limited.map((f, i) => ({
        id: `q-${Date.now()}-${i}`,
        file: f,
        fileName: f.name,
        status: 'pending' as const,
        editedText: '',
      }));

      if (queue.length > 0) {
        // 已经是队列模式：直接把新文件追加到现有队列尾部（不覆盖）
        setQueue((prev) => [...prev, ...newItems]);
      } else if (result && pendingFile) {
        // 从「单文件已完成」升级为队列：先把已转写的文件保留为一条已完成项，
        // 再追加新文件，避免之前的结果被覆盖丢失。
        const existing: QueueItem = {
          id: `q-${Date.now()}-existing`,
          file: pendingFile,
          fileName: currentFileName,
          status: 'done',
          result,
          editedText: editorText,
        };
        setQueue([existing, ...newItems]);
        setActiveQueueIdx(0);
        // 清理单文件态，交由队列态接管
        setPendingFile(null);
        setFileMeta(null);
      } else {
        // 追加模式：合并新文件到现有队列（保留已完成的项）
        setQueue(prev => [...prev, ...newItems]);
        setActiveQueueIdx(0);
      }

      setIsHistoryView(false);
      setStatus('ready');
      showToast(`已添加 ${newItems.length} 个文件到队列`, 'info');
      return;
    }

    // 单文件走原有流程，多文件走队列
    if (limited.length === 1 && !append) {
      const file = limited[0];
      setError(null);
      setStatus('validating');
      setProgress(0);
      setCurrentFileName(file.name);
      setPendingFile(file);
      setQueue([]);
      try {
        const meta = await buildAudioMeta(file);
        setFileMeta(meta);
        setStatus('ready');
      } catch {
        setStatus('error');
        setError('读取文件失败，请重试');
      }
      return;
    }

    // 多文件：构建队列
    setError(null);
    setStatus('ready');
    setPendingFile(null);
    setFileMeta(null);
    setQueue(
      limited.map((f, i) => ({
        id: `q-${Date.now()}-${i}`,
        file: f,
        fileName: f.name,
        status: 'pending' as const,
        editedText: '',
      }))
    );
    setActiveQueueIdx(0);
  }, [queue.length, result, pendingFile, currentFileName, editorText, showToast]);

  /** 第二步：用户确认 → 串行处理队列（或单文件） */
  const handleStartQueue = useCallback(async () => {
    // 单文件模式
    if (!isQueueMode) {
      if (!pendingFile) return;
      setStatus('transcribing');
      setProgress(0);

      // 为这个音频生成固定的置信度（开始时确定，过程中不变）
      const fixedConfidence = generateConfidenceForMode(transcribeMode);
      setCurrentStats({
        confidence: fixedConfidence,
        processingTime: 0,
        uploadSpeed: 0,
      });

      const startTime = performance.now();

      try {
        // 首次使用精准模式时，显示冷启动提示
        if (transcribeMode === 'accurate' && !showColdStartHint) {
          setShowColdStartHint(true);
          showToast('首次使用或后端休眠后，精准模式可能需要 10-30 秒冷启动，请耐心等待', 'info');
        }

        // 预处理音频（如果启用）
        let fileToTranscribe = pendingFile;
        if (enablePreprocess && shouldPreprocess(pendingFile)) {
          showToast('正在预处理音频...', 'info');
          fileToTranscribe = await preprocessAudio(pendingFile, {
            targetSampleRate: 16000,
            normalize: true,
            onProgress: (p) => {
              // 预处理占前 20% 进度
              setProgress(p * 0.2);
            },
          });
        }

        const res = await asrService.uploadAndTranscribe(fileToTranscribe, {
          onProgress: (p) => {
            // 转写占 20%~100% 进度
            setProgress(enablePreprocess ? 0.2 + p * 0.8 : p);
            const elapsed = (performance.now() - startTime) / 1000;
            setCurrentStats({
              confidence: fixedConfidence,
              processingTime: elapsed,
              uploadSpeed: pendingFile.size / elapsed,
            });
          },
          mode: transcribeMode,
        });
        setProgress(1);
        const finalStats = {
          ...res.stats,
          confidence: fixedConfidence,
        };
        setCurrentStats(finalStats);
        await new Promise((r) => setTimeout(r, 420));
        setResult({ ...res, stats: finalStats });
        setEditorText(res.fullText);
        setStatus('success');
        pushHistory(pendingFile.name, { ...res, stats: finalStats }, pendingFile);
        showToast('转写完成', 'success');
      } catch (err) {
        setStatus('error');
        const msg = err instanceof Error ? err.message : '转写出错，请重试';
        setError(msg);
        showToast(msg, 'error');
        setCurrentStats(undefined);
      }
      return;
    }

    // 多文件队列串行处理
    setStatus('transcribing');
    const items = queue.slice();
    let doneCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === 'done') {
        doneCount++;
        continue;
      }

      const fixedConfidence = generateConfidenceForMode(transcribeMode);

      setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'processing' } : q));
      setQueueProgress(0);
      setActiveQueueIdx(i);
      setCurrentStats({
        confidence: fixedConfidence,
        processingTime: 0,
        uploadSpeed: 0,
      });

      const startTime = performance.now();

      try {
        // 预处理音频（如果启用）
        let fileToTranscribe = item.file;
        if (enablePreprocess && shouldPreprocess(item.file)) {
          fileToTranscribe = await preprocessAudio(item.file, {
            targetSampleRate: 16000,
            normalize: true,
            onProgress: (p) => {
              setQueueProgress(p * 0.2);
            },
          });
        }

        const res = await asrService.uploadAndTranscribe(fileToTranscribe, {
          onProgress: (p) => {
            setQueueProgress(enablePreprocess ? 0.2 + p * 0.8 : p);
            const elapsed = (performance.now() - startTime) / 1000;
            setCurrentStats({
              confidence: fixedConfidence,
              processingTime: elapsed,
              uploadSpeed: item.file.size / elapsed,
            });
          },
          mode: transcribeMode,
        });
        setQueueProgress(1);
        const finalStats = {
          ...res.stats,
          confidence: fixedConfidence,
        };
        setQueue(prev => prev.map((q, idx) =>
          idx === i ? { ...q, status: 'done', result: { ...res, stats: finalStats }, editedText: res.fullText } : q
        ));
        setCurrentStats(finalStats);
        pushHistory(item.fileName, { ...res, stats: finalStats }, item.file);
        doneCount++;
        await new Promise((r) => setTimeout(r, 420));
      } catch (err) {
        const msg = err instanceof Error ? err.message : '转写出错';
        setQueue(prev => prev.map((q, idx) =>
          idx === i ? { ...q, status: 'error', errorMsg: msg } : q
        ));
      }
    }

    setStatus('success');
    setProgress(1);
    setActiveQueueIdx(0);
    showToast(`转写完成，共 ${doneCount} 个文件`, 'success');
  }, [isQueueMode, pendingFile, queue, transcribeMode, enablePreprocess, pushHistory, showToast]);

  /** 校验失败 */
  const handleValidationError = useCallback(
    (message: string) => {
      setStatus('error');
      setError(message);
      showToast(message, 'error');
    },
    [showToast],
  );

  /** 重置到初始态 */
  const handleReset = useCallback(() => {
    setStatus('idle');
    setFileMeta(null);
    setProgress(0);
    setError(null);
    setResult(null);
    setEditorText('');
    setPendingFile(null);
    setQueue([]);
    setActiveQueueIdx(0);
    setQueueProgress(0);
    setCurrentStats(undefined);
    setIsHistoryView(false);
    setHighlightEditor(false);
  }, []);

  /** 从队列中移除一个文件（转写前可移除；移空则回到初始态） */
  const handleRemoveQueueItem = useCallback((id: string) => {
    setQueue((prev) => {
      const next = prev.filter((q) => q.id !== id);
      if (next.length === 0) {
        // 队列清空 → 回到初始态
        setStatus('idle');
        setActiveQueueIdx(0);
        return [];
      }
      // 保证 activeQueueIdx 不越界
      setActiveQueueIdx((idx) => Math.min(idx, next.length - 1));
      return next;
    });
  }, []);

  /** 从历史记录加载到编辑区 */
  const handleLoadHistory = useCallback(
    (record: HistoryRecord) => {
      // 重置状态并加载历史记录
      handleReset();

      // 从历史记录加载时，标记为非录音来源
      setIsFromRecording(false);

      // 设置结果和编辑文本
      setResult(record.result);
      setEditorText(record.result.fullText);
      setCurrentFileName(record.fileName);

      // 从历史记录的audioData恢复音频文件用于播放
      if (record.audioData) {
        const blob = base64ToBlob(record.audioData.data, record.audioData.type);
        const file = new File([blob], record.fileName, { type: record.audioData.type });
        setPendingFile(file);
      }

      setFileMeta({
        name: record.fileName,
        size: record.audioData?.size || 0,
        type: record.audioData?.type || '',
        duration: record.result.duration,
      });
      setCurrentStats(record.result.stats);
      setStatus('success');
      setProgress(1);
      setIsHistoryView(true);
      setHighlightEditor(true);

      showToast('已加载历史记录', 'info');

      // 加载后高亮一段时间再淡出，给出明确的"内容已更新"反馈
      window.setTimeout(() => setHighlightEditor(false), 1600);

      // 延迟滚动，确保 DOM 已更新；滚动到校对区顶部并留出导航栏空间
      window.setTimeout(() => {
        const editorSection = document.querySelector('[data-section="editor"]');
        if (editorSection) {
          editorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 120);
    },
    [handleReset, showToast],
  );

  const handleDeleteHistory = useCallback(
    async (id: string) => {
      await deleteHistoryRecord(id);
    },
    [deleteHistoryRecord],
  );

  const handleClearHistory = useCallback(async () => {
    await clearHistoryRecords();
    showToast('已清空历史记录', 'info');
  }, [clearHistoryRecords, showToast]);

  // 当前活跃的编辑内容（队列模式取队列项，否则取单文件编辑区）
  const activeText = isQueueMode
    ? (queue[activeQueueIdx]?.editedText ?? '')
    : editorText;

  const setActiveText = (text: string) => {
    if (isQueueMode) {
      setQueue(prev => prev.map((q, i) => i === activeQueueIdx ? { ...q, editedText: text } : q));
    } else {
      setEditorText(text);
    }
  };

  const activeResult = isQueueMode
    ? (queue[activeQueueIdx]?.result ?? null)
    : result;

  const activeFileName = isQueueMode
    ? (queue[activeQueueIdx]?.fileName ?? 'transcript')
    : currentFileName;

  // 状态栏展示的指标：转写中用实时估算，完成后跟随当前查看的文件的最终统计。
  const displayStats = status === 'transcribing'
    ? currentStats
    : (activeResult?.stats ?? currentStats);

  const canExport =
    status === 'success' &&
    activeText.trim().length > 0;

  return (
    <div id="top" className="min-h-screen bg-white">
      {/* 顶部导航 */}
      <Navbar onLogoClick={scrollToTop} />

      {/* 后端离线提示（仅在检测到离线且非成功状态时显示） */}
      {backendStatus === 'offline' && status !== 'success' && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-lg bg-danger/10 px-4 py-2 text-sm font-medium text-danger shadow-lg">
          ⚠️ 无法连接 ASR 服务，请确认后端已启动（{ASR_ENDPOINT}）
        </div>
      )}

      {/* Hero */}
      <Hero onStart={scrollToWorkspace} />

      {/* 主功能区（扩大最大宽度到7xl，减少两边空白） */}
      <main
        ref={workspaceRef}
        className="mx-auto max-w-7xl scroll-mt-8 px-6 py-20 sm:py-24 lg:px-8"
      >
        {/* 全局隐私提示 */}
        <PrivacyBanner />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]"
        >
          {/* 左列：上传 + 编辑 + 导出 */}
          <div className="flex flex-col">
            <motion.section variants={fadeInUp}>
              <SectionTitle
                index="01"
                title="选择音频来源"
                desc="上传现有文件或直接在线录音"
              />
              {/* Tab 切换：上传 / 录音（SVG 图标替代 emoji） */}
              <div className="mb-4 flex gap-2 rounded-xl bg-canvas p-1.5">
                <button
                  onClick={() => setSourceMode('upload')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                    sourceMode === 'upload' ? 'bg-white text-ink shadow-sm' : 'text-subtle hover:text-body'
                  }`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 15V3m0 0L7 8m5-5l5 5"/><path d="M3 16v2a3 3 0 003 3h12a3 3 0 003-3v-2"/>
                  </svg>
                  上传音频文件
                </button>
                <button
                  onClick={() => setSourceMode('record')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                    sourceMode === 'record' ? 'bg-white text-ink shadow-sm' : 'text-subtle hover:text-body'
                  }`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>
                  </svg>
                  在线录音
                </button>
              </div>

              {/* 固定容器，防止上传/录音切换时跳动（与两个卡片的 min-h 对齐，消除多余空隙） */}
              <div className="min-h-[360px]">
                {sourceMode === 'upload' ? (
                  <Uploader
                    status={status}
                    fileMeta={fileMeta}
                    progress={progress}
                    error={error}
                    currentFile={pendingFile}
                    queue={queue}
                    activeQueueIdx={activeQueueIdx}
                    queueProgress={queueProgress}
                    onFilesSelected={handleFilesSelected}
                    onValidationError={handleValidationError}
                    onRemoveQueueItem={handleRemoveQueueItem}
                    onSetActiveQueueIdx={setActiveQueueIdx}
                    onReset={handleReset}
                  />
                ) : (
                  <Recorder
                    disabled={status === 'validating' || status === 'transcribing'}
                    onRecorded={(file) => void handleFilesSelected([file])}
                    recordedFile={isFromRecording ? pendingFile : null}
                  />
                )}
              </div>

              {/* 转写模式选择 + 确认按钮（文件就绪后显示） */}
              {status === 'ready' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="mt-5 rounded-card bg-white/90 backdrop-blur-xl p-6 shadow-glass border border-black/[0.04]"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">选择转写模式</p>
                    {isQueueMode && (
                      <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-xs font-medium text-body">
                        共 {queue.length} 个文件
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <ModeCard
                      active={transcribeMode === 'fast'}
                      onClick={() => setTranscribeMode('fast')}
                      title="快速模式"
                      subtitle="实时响应"
                      note="速度快，准确率低"
                    />
                    <ModeCard
                      active={transcribeMode === 'accurate'}
                      onClick={() => setTranscribeMode('accurate')}
                      title="精准模式"
                      subtitle="精确识别"
                      note="速度慢，准确率高"
                    />
                  </div>

                  {/* 音频预处理开关 */}
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-canvas/60 px-4 py-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink">音频预处理</p>
                      <p className="mt-0.5 text-xs text-subtle">自动归一化音量、降噪、格式转换</p>
                    </div>
                    <button
                      onClick={() => setEnablePreprocess(!enablePreprocess)}
                      role="switch"
                      aria-checked={enablePreprocess}
                      aria-label="音频预处理"
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                        enablePreprocess ? 'bg-ink' : 'bg-divider'
                      }`}
                    >
                      <motion.span
                        initial={false}
                        animate={{ x: enablePreprocess ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm"
                      />
                    </button>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <motion.button
                      onClick={handleStartQueue}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="btn-primary flex-1"
                    >
                      开始转写
                    </motion.button>
                    <button onClick={handleReset} className="btn-secondary px-6">
                      取消
                    </button>
                  </div>
                </motion.div>
              )}

              {/* 队列进度已移入 Uploader 的文件列表中统一展示 */}
            </motion.section>

            {/* 根据状态动态调整间距：空闲时紧凑，有内容时正常 */}
            <div className={status === 'idle' || status === 'error' ? 'h-6' : 'h-6'} />

            <motion.section variants={fadeInUp} data-section="editor" className="scroll-mt-24">
              <SectionTitle index="02" title="校对文本" desc="编辑转写结果，修正细节" />

              <Editor value={activeText} onChange={setActiveText} highlight={highlightEditor} fromHistory={isHistoryView} />
            </motion.section>

            {/* 根据状态动态调整间距 */}
            <div className={canExport ? 'h-6' : 'h-4'} />

            <motion.section variants={fadeInUp}>
              <SectionTitle index="03" title="导出结果" desc="下载为纯文本格式" />
              <Exporter
                text={activeText}
                fileName={activeFileName}
                disabled={!canExport}
                queue={queue}
                isQueueMode={isQueueMode}
              />
            </motion.section>
          </div>

          {/* 右列：质量指标 + 历史记录（桌面侧栏 / 移动端底部） */}
          <motion.aside variants={fadeInUp} className="flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
            {/* 实时状态栏（转写质量指标） */}
            <StatusBar
              stats={displayStats}
              phase={
                status === 'transcribing'
                  ? 'active'
                  : status === 'success' && displayStats
                    ? 'done'
                    : 'hidden'
              }
              mode={transcribeMode}
            />

            {/* 历史记录 */}
            <History
              records={history}
              onLoad={handleLoadHistory}
              onDelete={handleDeleteHistory}
              onClear={handleClearHistory}
            />
          </motion.aside>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

/** 转写模式选择卡片（去蓝化 + Apple 风格） */
function ModeCard({
  active,
  onClick,
  title,
  subtitle,
  note,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  note: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl border-2 p-4 text-left transition-all duration-200 ${
        active
          ? 'border-ink bg-ink/[0.04] shadow-sm'
          : 'border-divider bg-white/60 hover:border-ink/30 hover:bg-white/80'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`font-semibold ${active ? 'text-ink' : 'text-body'}`}>{title}</span>
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
            active ? 'border-ink' : 'border-divider'
          }`}
        >
          {active && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-subtle">{subtitle}</p>
      <p className="mt-1 text-xs font-medium text-ink/60">{note}</p>
    </button>
  );
}

/** 小节标题 */
function SectionTitle({ index, title, desc }: { index: string; title: string; desc: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <span className="text-sm font-semibold tabular-nums text-brand/60">{index}</span>
      <div>
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-sm text-subtle">{desc}</p>
      </div>
    </div>
  );
}

/** 根组件：注入 Toast Provider */
export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
