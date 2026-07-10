/**
 * 导出工具：将转写结果导出为 TXT 文件
 * 使用浏览器原生 Blob + <a download> 实现，无需后端。
 */

/** 触发浏览器下载 */
function triggerDownload(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 延迟释放，确保下载已启动
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 去掉文件扩展名，用作导出文件的基础名 */
function stripExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx === -1 ? name : name.slice(0, idx);
}

/**
 * 导出为 TXT。
 * @param text 编辑区当前文本（以用户编辑后的内容为准）
 * @param sourceName 源文件名，用于生成导出文件名
 */
export function exportAsTxt(text: string, sourceName: string): void {
  const base = stripExtension(sourceName) || 'transcript';
  triggerDownload(text, `${base}.txt`, 'text/plain');
}

/** 复制文本到剪贴板，返回是否成功 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // 回退方案：execCommand（用于非 HTTPS 或旧浏览器）
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
