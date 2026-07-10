import { useState } from 'react';
import { motion } from 'framer-motion';
import { exportAsTxt } from '../utils/export';
import { exportQueueAsZip } from '../utils/batchExport';
import { useToast } from './Toast';
import type { QueueItem } from '../types';

interface ExporterProps {
  /** 编辑区当前文本（TXT 以此为准） */
  text: string;
  /** 源文件名 */
  fileName: string;
  /** 是否可导出 */
  disabled: boolean;
  /** 队列项（批量导出时使用） */
  queue?: QueueItem[];
  /** 是否为队列模式 */
  isQueueMode?: boolean;
}

/**
 * 导出组件
 * 支持单文件 TXT 导出和多文件批量 ZIP 导出。
 */
export default function Exporter({ text, fileName, disabled, queue = [], isQueueMode = false }: ExporterProps) {
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleTxt = () => {
    exportAsTxt(text, fileName);
    showToast('已导出 TXT 文件', 'success');
  };

  const handleBatchZip = async () => {
    setIsExporting(true);
    try {
      await exportQueueAsZip(queue);
      showToast('批量导出成功', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : '批量导出失败';
      showToast(msg, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const doneCount = queue.filter((q) => q.status === 'done').length;
  const canBatchExport = isQueueMode && doneCount > 1 && !disabled;

  return (
    <div className="flex flex-col gap-3">
      {/* 单文件导出 */}
      <motion.button
        onClick={handleTxt}
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: 1.01 }}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className="btn-primary w-full !py-4"
      >
        <span className="flex items-center justify-center gap-2 text-base">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M8 2v8m0 0l3-3m-3 3L5 7"
              stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round"
            />
            <path
              d="M3 11v1.5A1.5 1.5 0 004.5 14h7a1.5 1.5 0 001.5-1.5V11"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
            />
          </svg>
          {isQueueMode ? '导出当前文件' : '导出 TXT 文本'}
        </span>
      </motion.button>

      {/* 批量导出（队列模式且有多个已完成文件时显示） */}
      {canBatchExport && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleBatchZip}
          disabled={isExporting}
          whileHover={isExporting ? undefined : { scale: 1.01 }}
          whileTap={isExporting ? undefined : { scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className="btn-secondary w-full !py-4"
        >
          <span className="flex items-center justify-center gap-2 text-base">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="3" y="5" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M5 5V3.5A1.5 1.5 0 016.5 2h3A1.5 1.5 0 0111 3.5V5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 8v3M6.5 10.5h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {isExporting ? '打包中...' : `批量导出全部 (${doneCount} 个文件)`}
          </span>
        </motion.button>
      )}
    </div>
  );
}
