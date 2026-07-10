/**
 * 通用格式化工具函数
 */

/** 将字节数格式化为易读字符串（KB / MB） */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** 将秒数格式化为 mm:ss（用于时长展示） */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 格式化 ISO 时间为本地可读格式（YYYY-MM-DD HH:mm） */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** 生成文本预览（截取前 n 字并去除换行） */
export function makePreview(text: string, n = 50): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > n ? `${clean.slice(0, n)}…` : clean;
}

/** 统计字数（中文按字符计，去除多余空白） */
export function countChars(text: string): number {
  return text.replace(/\s/g, '').length;
}
