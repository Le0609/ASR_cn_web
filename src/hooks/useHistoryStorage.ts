import { useCallback, useEffect, useState } from 'react';
import {
  getAllHistory,
  addHistory,
  deleteHistory,
  clearAllHistory,
  migrateFromLocalStorage,
  isIndexedDBAvailable,
} from '../utils/indexedDB';
import type { HistoryRecord } from '../types';

/**
 * useHistoryStorage
 * IndexedDB 持久化的历史记录 Hook
 * 自动从 localStorage 迁移数据，兼容旧版本
 */
export function useHistoryStorage(
  localStorageKey: string,
): [HistoryRecord[], (record: HistoryRecord) => Promise<void>, (id: string) => Promise<void>, () => Promise<void>] {
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  // 初始化：加载数据 + 迁移
  useEffect(() => {
    const init = async () => {
      if (!isIndexedDBAvailable()) {
        console.warn('IndexedDB not available, using in-memory storage');
        return;
      }

      try {
        // 尝试从 localStorage 迁移
        await migrateFromLocalStorage(localStorageKey);

        // 加载 IndexedDB 中的数据
        const records = await getAllHistory();
        setHistory(records);
      } catch (error) {
        console.error('Failed to initialize history storage:', error);
      }
    };

    void init();
  }, [localStorageKey]);

  // 添加记录
  const addRecord = useCallback(async (record: HistoryRecord) => {
    try {
      await addHistory(record);
      setHistory((prev) => [record, ...prev].slice(0, 50)); // 本地状态也限制 50 条
    } catch (error) {
      console.error('Failed to add history:', error);
    }
  }, []);

  // 删除记录
  const deleteRecord = useCallback(async (id: string) => {
    try {
      await deleteHistory(id);
      setHistory((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Failed to delete history:', error);
    }
  }, []);

  // 清空全部
  const clearAll = useCallback(async () => {
    try {
      await clearAllHistory();
      setHistory([]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }, []);

  return [history, addRecord, deleteRecord, clearAll];
}
