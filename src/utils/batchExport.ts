/**
 * 批量导出工具：将多个转写结果打包为 ZIP
 */

import JSZip from 'jszip';
import type { QueueItem } from '../types';

/** 去掉文件扩展名 */
function stripExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx === -1 ? name : name.slice(0, idx);
}

/** 生成安全的文件名（去除特殊字符） */
function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_');
}

/**
 * 批量导出队列中已完成的文件为 ZIP 压缩包
 * @param items 队列项数组
 * @param onProgress 进度回调 (0~1)
 */
export async function exportQueueAsZip(
  items: QueueItem[],
  onProgress?: (progress: number) => void,
): Promise<void> {
  const doneItems = items.filter((item) => item.status === 'done' && item.editedText.trim());

  if (doneItems.length === 0) {
    throw new Error('没有可导出的文件');
  }

  onProgress?.(0.1);

  const zip = new JSZip();
  const folder = zip.folder('transcripts');

  if (!folder) {
    throw new Error('创建 ZIP 文件夹失败');
  }

  // 添加每个转写结果为独立 TXT 文件
  doneItems.forEach((item, idx) => {
    const baseName = sanitizeFileName(stripExtension(item.fileName) || `transcript_${idx + 1}`);
    const fileName = `${baseName}.txt`;
    folder.file(fileName, item.editedText);
  });

  onProgress?.(0.5);

  // 生成 ZIP
  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (metadata) => {
      // 将打包进度映射到 50%~95%
      onProgress?.(0.5 + metadata.percent * 0.45);
    },
  );

  onProgress?.(0.95);

  // 触发浏览器下载
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `转写结果_${formatTimestamp()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  onProgress?.(1);
}

/** 生成时间戳：YYYYMMDD_HHmmss */
function formatTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
