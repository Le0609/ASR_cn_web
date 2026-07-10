import { motion } from 'framer-motion';

interface ProgressBarProps {
  /** 进度值 0~1 */
  value: number;
  /** 是否显示流动高光（处理进行中时开启，完成后关闭） */
  active?: boolean;
}

/**
 * Apple 风格进度条
 * - 细腻的胶囊轨道 + 深灰渐变填充
 * - 进行中叠加一层缓慢流动的高光，避免"僵硬感"
 * - 填充跟随 value 平滑推进（短线性过渡，贴合高频进度更新）
 */
export default function ProgressBar({ value, active = true }: ProgressBarProps) {
  const pct = Math.max(3, Math.min(100, value * 100));

  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
      <motion.div
        className="absolute inset-y-0 left-0 overflow-hidden rounded-full"
        style={{ background: 'linear-gradient(90deg, #1d1d1f 0%, #48484a 100%)', willChange: 'width' }}
        animate={{ width: `${pct}%` }}
        transition={{ ease: 'linear', duration: 0.2 }}
      >
        {active && (
          <motion.span
            className="absolute inset-y-0 w-1/2 rounded-full"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
            }}
            animate={{ x: ['-120%', '260%'] }}
            transition={{ repeat: Infinity, duration: 1.3, ease: 'easeInOut' }}
          />
        )}
      </motion.div>
    </div>
  );
}
