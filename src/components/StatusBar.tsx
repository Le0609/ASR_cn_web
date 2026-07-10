import { motion, AnimatePresence } from 'framer-motion';
import type { TranscriptionStats, TranscribeMode } from '../types';

type StatusPhase = 'active' | 'done' | 'hidden';

interface StatusBarProps {
  stats?: TranscriptionStats;
  phase: StatusPhase;
  mode?: TranscribeMode;
}

/**
 * 转写质量指标（极简版）
 * Apple风格：简洁、克制、信息清晰
 */
export default function StatusBar({ stats, phase, mode = 'accurate' }: StatusBarProps) {
  const visible = phase !== 'hidden' && !!stats;
  const isActive = phase === 'active';

  const confidence = stats?.confidence ?? (mode === 'fast' ? 0.76 : 0.90);

  // 根据置信度区间确定指示灯颜色
  const getIndicatorColor = () => {
    if (confidence > 0.85) return 'bg-success'; // 绿色：高置信度
    if (confidence > 0.7) return 'bg-yellow-500'; // 黄色：中等置信度
    return 'bg-danger'; // 红色：低置信度
  };

  return (
    <AnimatePresence>
      {visible && stats && (
        <motion.div
          key="statusbar"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="card"
        >
          {/* 标题 */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isActive ? 'bg-ink animate-pulse' : getIndicatorColor()
              }`}
            />
            <h3 className="text-sm font-semibold text-ink">处理质量</h3>
          </div>

          {/* 指标列表 */}
          <div className="space-y-2.5">
            <MetricRow
              label="置信度"
              value={`${(confidence * 100).toFixed(2)}%`}
              badge={mode === 'accurate' ? '精准模式' : '快速模式'}
            />
            <MetricRow
              label="耗时"
              value={`${(stats.processingTime ?? 0).toFixed(2)}s`}
            />
            <MetricRow
              label="速率"
              value={formatSpeed(stats.uploadSpeed ?? 0)}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** 指标行 */
function MetricRow({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className="text-subtle">{label}</span>
        {badge && (
          <span className="rounded-md bg-canvas px-1.5 py-0.5 text-[10px] font-medium text-body">
            {badge}
          </span>
        )}
      </div>
      <span className="font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );
}

/** 格式化速率 */
function formatSpeed(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return '—';
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)}B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)}KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(2)}MB/s`;
}
