/**
 * 重试工具：为异步操作提供自动重试能力
 */

export interface RetryOptions {
  /** 最大重试次数（默认 3） */
  maxRetries?: number;
  /** 初始延迟（毫秒，默认 1000） */
  initialDelay?: number;
  /** 延迟倍数（指数退避，默认 2） */
  backoffMultiplier?: number;
  /** 最大延迟上限（毫秒，默认 10000） */
  maxDelay?: number;
  /** 判断错误是否可重试（默认所有错误都重试） */
  shouldRetry?: (error: Error) => boolean;
  /** 每次重试前的回调 */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * 带重试的异步函数执行器（指数退避策略）
 * @param fn 要执行的异步函数
 * @param options 重试配置
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    backoffMultiplier = 2,
    maxDelay = 10000,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: Error;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 已达最大重试次数
      if (attempt >= maxRetries) {
        throw lastError;
      }

      // 检查是否应该重试
      if (!shouldRetry(lastError)) {
        throw lastError;
      }

      attempt++;
      onRetry?.(attempt, lastError);

      // 计算延迟（指数退避 + 随机抖动）
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay,
      );
      const jitter = Math.random() * 0.3 * delay; // ±15% 抖动
      const actualDelay = delay + jitter;

      await sleep(actualDelay);
    }
  }

  throw lastError!;
}

/** 延迟工具 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 判断错误是否为网络错误（可重试）
 */
export function isNetworkError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('连接') ||
    message.includes('请求失败') ||
    error.name === 'AbortError'
  );
}

/**
 * 判断错误是否为客户端错误（不应重试）
 */
export function isClientError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('400') ||
    message.includes('401') ||
    message.includes('403') ||
    message.includes('404') ||
    message.includes('不支持') ||
    message.includes('格式错误')
  );
}
