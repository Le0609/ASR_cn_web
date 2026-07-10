import Logo from './Logo';

/**
 * 页脚
 * 简洁的版权与链接信息。
 */
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-black/5 bg-canvas">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo size={28} showText />
          <nav className="flex items-center gap-6 text-sm text-subtle">
            <a href="#top" className="transition-colors hover:text-brand">
              回到顶部
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-brand"
            >
              GitHub
            </a>
            <span>隐私说明</span>
          </nav>
        </div>
        <p className="mt-6 text-center text-xs text-subtle/70 sm:text-left">
          © {year} Echo · 音频与转写数据仅存储在你的浏览器本地，不会上传到任何服务器。
        </p>
      </div>
    </footer>
  );
}
