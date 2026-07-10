import { motion } from 'framer-motion';

/**
 * 全局隐私提示横幅
 * 放置在主功能区上方，告知用户数据安全保障
 */
export default function PrivacyBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="mb-8 flex items-center justify-center gap-6 rounded-xl bg-canvas/60 px-6 py-3 backdrop-blur-sm"
    >
      <PrivacyItem
        icon={<ShieldIcon />}
        label="端到端加密"
      />
      <div className="h-4 w-px bg-divider" />
      <PrivacyItem
        icon={<ProcessorIcon />}
        label="本地推理处理"
      />
      <div className="h-4 w-px bg-divider" />
      <PrivacyItem
        icon={<StorageIcon />}
        label="仅浏览器缓存"
      />
    </motion.div>
  );
}

/** 隐私项 */
function PrivacyItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-5 w-5 items-center justify-center text-ink/60">
        {icon}
      </div>
      <span className="text-xs font-medium text-body">{label}</span>
    </div>
  );
}

/** 盾牌图标 */
function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

/** 处理器图标 */
function ProcessorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
    </svg>
  );
}

/** 存储图标 */
function StorageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  );
}
