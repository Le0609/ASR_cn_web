import { motion } from 'framer-motion';

interface LogoProps {
  /** 图标尺寸（px） */
  size?: number;
  /** 是否显示文字 */
  showText?: boolean;
  className?: string;
}

/**
 * Echo 品牌标识
 * 线体极简设计：五根圆角竖条组成的音频均衡器，中间高两端低，
 * 象征"声音"。hover 时柱条轻微律动。小尺寸下依然清晰、大气。
 */
export default function Logo({ size = 28, showText = true, className = '' }: LogoProps) {
  // 五根柱条的相对高度（中间最高，对称）
  const bars = [0.4, 0.72, 1, 0.72, 0.4];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        initial="rest"
        whileHover="hover"
        className="shrink-0"
        aria-label="Echo"
      >
        <defs>
          {/* 低调的墨色渐变，替代原来过亮的蓝→青，更沉稳 Apple 感 */}
          <linearGradient id="echoLogo" x1="0" y1="0" x2="28" y2="28">
            <stop offset="0" stopColor="#1D1D1F" />
            <stop offset="1" stopColor="#48484A" />
          </linearGradient>
        </defs>
        {bars.map((h, i) => {
          const barHeight = h * 18;
          const x = 4 + i * 5;
          const y = 14 - barHeight / 2;
          return (
            <motion.rect
              key={i}
              x={x}
              y={y}
              width="2.6"
              height={barHeight}
              rx="1.3"
              fill="url(#echoLogo)"
              style={{ transformOrigin: `${x + 1.3}px 14px` }}
              variants={{
                rest: { scaleY: 1 },
                hover: { scaleY: [1, i === 2 ? 0.5 : 1.5, 1] },
              }}
              transition={{
                duration: 0.7,
                ease: 'easeInOut',
                delay: i * 0.06,
                repeat: 0,
              }}
            />
          );
        })}
      </motion.svg>

      {showText && (
        <span className="text-lg font-semibold tracking-tight text-ink">Echo</span>
      )}
    </div>
  );
}
