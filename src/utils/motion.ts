/**
 * Framer Motion 共享动画变体
 * 集中管理，保证全站动效节奏一致（Apple 风格：轻快、克制、有回弹）。
 * 所有动画仅使用 transform / opacity，确保 GPU 加速。
 */
import type { Variants } from 'framer-motion';

/** Apple 风格缓动曲线（三次贝塞尔控制点） */
export const easeApple: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** 滚动进入视口时的渐入 + 上移 */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeApple },
  },
};

/** 容器：子元素依次错峰进入 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

/** 通用滚动触发配置：进入视口一次即触发 */
export const viewportOnce = { once: true, amount: 0.2 } as const;
