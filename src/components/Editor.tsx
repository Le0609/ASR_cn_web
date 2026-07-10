import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { countChars } from '../utils/format';
import { copyToClipboard } from '../utils/export';
import { useToast } from './Toast';

interface EditorProps {
  /** 编辑区文本 */
  value: string;
  onChange: (text: string) => void;
  /** 加载历史后短暂高亮，给出"内容已更新"的明确反馈 */
  highlight?: boolean;
  /** 当前内容来自历史记录（展示徽标） */
  fromHistory?: boolean;
}

/**
 * 转写结果编辑器
 * - 可编辑 textarea
 * - 实时字数统计
 * - 复制 / 全选快捷操作
 */
export default function Editor({ value, onChange, highlight = false, fromHistory = false }: EditorProps) {
  const { showToast } = useToast();
  const charCount = useMemo(() => countChars(value), [value]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(value);
    showToast(ok ? '已复制到剪贴板' : '复制失败，请手动选择', ok ? 'success' : 'error');
  };

  const handleSelectAll = () => {
    const ta = document.getElementById('transcript-editor') as HTMLTextAreaElement | null;
    ta?.focus();
    ta?.select();
  };

  return (
    <motion.div
      className="card"
      animate={
        highlight
          ? { boxShadow: '0 0 0 3px rgba(29,29,31,0.14), 0 8px 24px rgba(0,0,0,0.08)' }
          : { boxShadow: '0 2px 12px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)' }
      }
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-ink">转写结果</h3>
            {fromHistory && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-medium text-body">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v5h5" />
                  <path d="M3.05 13A9 9 0 106 5.3L3 8" />
                  <path d="M12 7v5l3 3" />
                </svg>
                历史记录
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-subtle">可直接编辑校对，修改会实时保存到当前会话</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleSelectAll} className="btn-ghost">
            全选
          </button>
          <button onClick={handleCopy} className="btn-ghost">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect
                x="5" y="5" width="8" height="9" rx="1.5"
                stroke="currentColor" strokeWidth="1.4"
              />
              <path
                d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5"
                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
              />
            </svg>
            复制
          </button>
        </div>
      </div>

      <motion.textarea
        id="transcript-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder="转写结果会显示在这里…"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="scroll-slim h-72 w-full resize-y rounded-lg border border-black/10 bg-white p-4 text-[15px] leading-relaxed text-body outline-none transition-colors placeholder:text-subtle/60 focus:border-brand/50 focus:ring-2 focus:ring-brand/15 sm:h-80"
      />

      <div className="mt-3 flex items-center justify-between text-sm text-subtle">
        <span className="tabular-nums">共 {charCount} 字</span>
        <span>{value.trim() ? '已就绪，可导出' : '暂无内容'}</span>
      </div>
    </motion.div>
  );
}
