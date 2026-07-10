import { motion, useScroll, useTransform } from 'framer-motion';
import { easeApple } from '../utils/motion';

interface HeroProps {
  /** 点击 CTA 时平滑滚动到功能区 */
  onStart: () => void;
}

/**
 * Hero 区域
 * - 全屏流动声波曲线背景（丝滑 SVG 正弦波 + 横向漂移）
 * - 右下角悬浮麦克风按钮：明确的启用/停止开关，授权后背景跟随实时音频
 * - 聚焦中文主张 + 英文副标，去掉大标题
 * - 滚动视差 + 渐入动画
 */
export default function Hero({ onStart }: HeroProps) {
  const { scrollY } = useScroll();
  const contentY = useTransform(scrollY, [0, 500], [0, -50]);
  const contentOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const bgY = useTransform(scrollY, [0, 600], [0, 80]);

  return (
    <section className="relative flex min-h-[94vh] items-center justify-center overflow-hidden bg-hero-gradient px-6 pt-16">
      {/* ===== 背景：流动声波曲线（样式 4） ===== */}
      <motion.div
        aria-hidden
        style={{ y: bgY, willChange: 'transform' }}
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute left-0 top-1/2 h-[60%] w-[200%] -translate-y-1/2"
          style={{
            opacity: 0.38,
            animation: 'waveDrift 14s linear infinite',
            willChange: 'transform',
            maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
          }}
        >
          <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className="h-full w-full">
            <defs>
              <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#0A84FF" stopOpacity="0.5" />
                <stop offset="0.5" stopColor="#5AC8FA" stopOpacity="0.7" />
                <stop offset="1" stopColor="#AF52DE" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            {[0, 1, 2].map((k) => (
              <path
                key={k}
                d="M0 100 Q75 40 150 100 T300 100 T450 100 T600 100 T750 100 T900 100 T1050 100 T1200 100"
                fill="none"
                stroke="url(#flowGrad)"
                strokeWidth={2 - k * 0.5}
                strokeLinecap="round"
                style={{ opacity: 1 - k * 0.3 }}
              />
            ))}
          </svg>
        </div>
      </motion.div>

      {/* 顶部 / 底部渐隐遮罩 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-transparent to-white/90"
      />

      {/* ===== 前景内容 ===== */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity, willChange: 'transform, opacity' }}
        className="relative z-10 mx-auto max-w-2xl text-center"
      >
        {/* 徽章：仅保留英文 */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeApple }}
          className="mb-9 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-5 py-2 shadow-[0_2px_16px_rgba(0,0,0,0.06)] backdrop-blur-md"
        >
          <span className="text-sm font-medium text-subtle">Free &amp; Private</span>
        </motion.div>

        {/* 诗意英文标题（单行紧凑） */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: easeApple, delay: 0.1 }}
          className="whitespace-nowrap text-[clamp(2.2rem,5.5vw,4rem)] font-semibold leading-tight tracking-tight text-ink"
        >
          Every Voice Finds Its Words
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: easeApple, delay: 0.2 }}
          className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-body/80"
        >
          上传音频，几秒内转成可编辑的文字稿。在线校对，一键导出 TXT。
          全程在浏览器本地完成。
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: easeApple, delay: 0.4 }}
          className="mt-11"
        >
          <motion.button
            onClick={onStart}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full border-2 border-ink bg-ink px-10 py-4 text-base font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-all hover:bg-white hover:text-ink hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)]"
          >
            <span className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent opacity-100 transition-opacity group-hover:opacity-0" />
            <span className="relative">开始使用</span>
            <motion.svg
              className="relative"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
              animate={{ y: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            >
              <path
                d="M8 3v9M8 12l4-4M8 12l-4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </motion.button>
        </motion.div>
      </motion.div>

      {/* 底部滚动提示（可点击） */}
      <motion.button
        onClick={onStart}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        style={{ opacity: contentOpacity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 cursor-pointer"
        aria-label="滚动到功能区"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          className="flex h-9 w-6 items-start justify-center rounded-full border-2 border-subtle/40 p-1.5 transition-colors hover:border-brand/60"
        >
          <span className="h-1.5 w-1 rounded-full bg-subtle/50" />
        </motion.div>
      </motion.button>
    </section>
  );
}
