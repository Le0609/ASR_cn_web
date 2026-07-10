import { useCallback, useEffect, useState } from 'react';

/**
 * useLocalStorage
 * 将 state 与 localStorage 双向同步的自定义 Hook。
 * - 初始化时从 localStorage 读取（带 JSON 解析容错）
 * - 更新时写回 localStorage
 * - 监听 storage 事件，实现多标签页同步
 *
 * @param key localStorage 键名
 * @param initialValue 初始值（懒加载）
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  // 懒初始化：仅在首次渲染时读取，避免每次渲染都触碰 localStorage
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`读取 localStorage 键 "${key}" 失败：`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch (error) {
          console.warn(`写入 localStorage 键 "${key}" 失败：`, error);
        }
        return next;
      });
    },
    [key],
  );

  // 跨标签页同步：其他标签页修改同一 key 时更新本页 state
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T);
        } catch {
          /* 忽略解析错误 */
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key]);

  return [storedValue, setValue];
}
