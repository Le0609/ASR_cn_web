import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ToastMessage, ToastType } from '../types';
import { easeApple } from '../utils/motion';

interface ToastContextValue {
  /** 弹出一条 Toast */
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** 在任意组件中调用 Toast 的 Hook */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast 必须在 ToastProvider 内使用');
  return ctx;
}

/** 各类型对应的图标与配色 */
const TOAST_STYLE: Record<ToastType, { icon: string; ring: string }> = {
  success: { icon: '✓', ring: 'text-success' },
  error: { icon: '!', ring: 'text-danger' },
  info: { icon: 'i', ring: 'text-brand' },
};

/**
 * ToastProvider
 * 提供全局轻提示能力：右上角滑入、自动消失（2.4s），支持堆叠。
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `t-${idRef.current++}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    // 自动移除
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast 容器：固定右上，pointer-events-none 让下方仍可交互 */}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2 sm:right-6 sm:top-6">
        <AnimatePresence>
          {toasts.map((t) => {
            const style = TOAST_STYLE[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.9 }}
                transition={{ duration: 0.35, ease: easeApple }}
                className="pointer-events-auto flex items-center gap-3 rounded-xl bg-white/90 px-4 py-3 shadow-card-hover backdrop-blur-md"
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full bg-canvas text-sm font-bold ${style.ring}`}
                >
                  {style.icon}
                </span>
                <span className="text-sm font-medium text-ink">{t.message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
