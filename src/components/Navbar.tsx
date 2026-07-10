import { motion } from 'framer-motion';
import Logo from './Logo';

interface NavbarProps {
  /** 点击 Logo 回到顶部 */
  onLogoClick?: () => void;
}

/**
 * 顶部导航栏
 * 固定在顶部，半透明磨砂背景，左侧 Logo，右侧社交/反馈链接。
 */
export default function Navbar({ onLogoClick }: NavbarProps) {
  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-white/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* 左：Logo */}
        <button
          onClick={onLogoClick}
          className="group -ml-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-black/[0.03] active:bg-black/[0.06]"
          aria-label="回到顶部"
        >
          <Logo size={28} showText />
        </button>

        {/* 右：社交/反馈入口 */}
        <div className="flex items-center gap-1">
          <NavLink
            href="https://github.com"
            icon={<GitHubIcon />}
            label="GitHub"
            external
          />
          <NavLink
            href="https://twitter.com"
            icon={<TwitterIcon />}
            label="Twitter"
            external
          />
          <NavLink
            href="https://www.xfyun.cn"
            icon={<IFlyTekIcon />}
            label="讯飞云"
            external
          />
        </div>
      </div>
    </motion.nav>
  );
}

/** 导航链接 */
function NavLink({
  href,
  icon,
  label,
  external = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  external?: boolean;
}) {
  return (
    <motion.a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-black/[0.05] hover:text-ink"
      aria-label={label}
    >
      {icon}
    </motion.a>
  );
}

/** GitHub 图标（线体） */
function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"
      />
    </svg>
  );
}

/** Twitter / X 图标（线体） */
function TwitterIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M4 4l9.5 9.5m0 0L22 22M13.5 13.5L22 4M4 22l9.5-9.5"
      />
    </svg>
  );
}

/** 讯飞云图标（简化云朵线体） */
function IFlyTekIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M18 10a4 4 0 00-8 0 4 4 0 00-4 0 5 5 0 000 10h12a5 5 0 000-10z"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
