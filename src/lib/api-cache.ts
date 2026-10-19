// 简单内存缓存，适用于 API 路由
// 存储在进程内存中，重启即失效

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttlSeconds = 300): void {
  store.set(key, { data, expiry: Date.now() + ttlSeconds * 1000 });
}

export function deleteCache(key: string): void {
  store.delete(key);
}

export function invalidateCache(prefix: string): void {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) {
      store.delete(k);
    }
  }
}
