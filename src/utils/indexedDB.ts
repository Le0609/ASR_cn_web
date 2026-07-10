/**
 * IndexedDB 持久化工具
 * 使用原生 IndexedDB API，无需第三方依赖
 * 用于存储历史记录，解决 localStorage 容量限制
 */

import type { HistoryRecord } from '../types';

const DB_NAME = 'EchoVoiceScribe';
const DB_VERSION = 1;
const STORE_NAME = 'history';
const MAX_RECORDS = 50; // 增加到 50 条（IndexedDB 容量更大）

/**
 * 打开或创建数据库
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建历史记录存储
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // 创建索引以便按时间排序
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * 获取所有历史记录（按时间倒序）
 */
export async function getAllHistory(): Promise<HistoryRecord[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('createdAt');
      const request = index.openCursor(null, 'prev'); // 倒序

      const records: HistoryRecord[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          records.push(cursor.value as HistoryRecord);
          cursor.continue();
        } else {
          db.close();
          resolve(records);
        }
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to get history from IndexedDB:', error);
    return [];
  }
}

/**
 * 添加历史记录
 */
export async function addHistory(record: HistoryRecord): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // 添加新记录
      const addRequest = store.put(record);

      addRequest.onsuccess = async () => {
        // 检查记录数量，超出则删除最旧的
        const countRequest = store.count();
        countRequest.onsuccess = () => {
          const count = countRequest.result;
          if (count > MAX_RECORDS) {
            // 删除最旧的记录
            const index = store.index('createdAt');
            const cursorRequest = index.openCursor(null, 'next'); // 正序（最旧的在前）
            let toDelete = count - MAX_RECORDS;

            cursorRequest.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
              if (cursor && toDelete > 0) {
                store.delete(cursor.primaryKey);
                toDelete--;
                cursor.continue();
              }
            };
          }
        };

        db.close();
        resolve();
      };

      addRequest.onerror = () => {
        db.close();
        reject(addRequest.error);
      };
    });
  } catch (error) {
    console.error('Failed to add history to IndexedDB:', error);
    throw error;
  }
}

/**
 * 删除单条历史记录
 */
export async function deleteHistory(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        db.close();
        resolve();
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to delete history from IndexedDB:', error);
    throw error;
  }
}

/**
 * 清空所有历史记录
 */
export async function clearAllHistory(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        db.close();
        resolve();
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to clear history from IndexedDB:', error);
    throw error;
  }
}

/**
 * 从 localStorage 迁移历史记录到 IndexedDB
 */
export async function migrateFromLocalStorage(key: string): Promise<void> {
  try {
    const data = localStorage.getItem(key);
    if (!data) return;

    const records: HistoryRecord[] = JSON.parse(data);
    if (!Array.isArray(records) || records.length === 0) return;

    // 批量写入 IndexedDB
    for (const record of records) {
      await addHistory(record);
    }

    // 迁移成功后清理 localStorage
    localStorage.removeItem(key);
    console.log(`Migrated ${records.length} records from localStorage to IndexedDB`);
  } catch (error) {
    console.error('Failed to migrate from localStorage:', error);
  }
}

/**
 * 检查 IndexedDB 是否可用
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}
