import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { HistoryRecord } from '../types';
import { formatDateTime } from '../utils/format';
import { easeApple } from '../utils/motion';

interface HistoryProps {
  records: HistoryRecord[];
  /** 点击某条 → 加载到编辑区 */
  onLoad: (record: HistoryRecord) => void;
  /** 删除单条 */
  onDelete: (id: string) => void;
  /** 清空全部 */
  onClear: () => void;
}

/**
 * 历史记录侧栏
 * - 可折叠 / 展开
 * - 列表项进出场动画（AnimatePresence）
 * - 支持加载、删除单条、清空全部
 */
export default function History({ records, onLoad, onDelete, onClear }: HistoryProps) {
  const [collapsed, setCollapsed] = useState(false);
  // 记录待确认删除的 id（二次确认）
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="card">
      {/* 头部：标题 + 折叠按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-ink">历史记录</h3>
          {records.length > 0 && (
            <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-subtle">
              {records.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {records.length > 0 && (
            <AnimatePresence mode="wait">
              {confirmClear ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1"
                >
                  <button
                    onClick={() => {
                      onClear();
                      setConfirmClear(false);
                    }}
                    className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-danger hover:bg-danger/10"
                  >
                    确认清空
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="btn-ghost !text-subtle"
                  >
                    取消
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="clear"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setConfirmClear(true)}
                  className="btn-ghost !text-subtle"
                >
                  清空
                </motion.button>
              )}
            </AnimatePresence>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-canvas"
            aria-label={collapsed ? '展开历史记录' : '折叠历史记录'}
          >
            <motion.svg
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              animate={{ rotate: collapsed ? -90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round"
              />
            </motion.svg>
          </button>
        </div>
      </div>

      {/* 列表主体 */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: easeApple }}
            className="overflow-hidden"
          >
            {records.length === 0 ? (
              <p className="py-8 text-center text-sm text-subtle">
                暂无记录，完成一次转写后会自动保存在这里
              </p>
            ) : (
              <ul className="scroll-slim mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {records.map((r) => (
                    <motion.li
                      key={r.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -12, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.25, ease: easeApple }}
                      className="group"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onLoad(r)}
                        onKeyDown={(e) => e.key === 'Enter' && onLoad(r)}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent bg-canvas/60 p-3 transition-all hover:border-brand/20 hover:bg-white hover:shadow-card"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink" title={r.fileName}>
                            {r.fileName}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-subtle">
                            {r.preview}
                          </p>
                          <p className="mt-1.5 text-[11px] text-subtle/70">
                            {formatDateTime(r.createdAt)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(r.id);
                          }}
                          aria-label="删除该记录"
                          className="shrink-0 rounded-lg p-1.5 text-subtle/50 opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                        >
                          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                            <path
                              d="M4 4l8 8M12 4l-8 8"
                              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
