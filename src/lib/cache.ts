/**
 * HRMS uchun In-Memory va SessionStorage Kesh Tizimi.
 * Sahifalar aro o'tganda (tab switching) ma'lumotlarni qayta-qayta yuklamaslik,
 * so'rovlar sonini kamaytirish va tizimni chaqmoqdek tez ishlashini ta'minlaydi.
 */

interface CacheRecord<T> {
  data: T;
  timestamp: number;
}

const inMemoryStore = new Map<string, CacheRecord<any>>();

// Standart kesh muddati: 15 minutes (yoki sahifada yangilash tugmasi bosilguncha)
const DEFAULT_TTL_MS = 15 * 60 * 1000;

export function getCachedData<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
  // 1. Operativ xotira (RAM / Memory) - 0 ms
  const memRecord = inMemoryStore.get(key);
  if (memRecord && Date.now() - memRecord.timestamp < ttlMs) {
    return memRecord.data as T;
  }

  // 2. Brauzer sessiyasi (sessionStorage)
  try {
    const raw = sessionStorage.getItem(`hrms_cache_${key}`);
    if (raw) {
      const parsed: CacheRecord<T> = JSON.parse(raw);
      if (Date.now() - parsed.timestamp < ttlMs) {
        inMemoryStore.set(key, parsed);
        return parsed.data;
      } else {
        sessionStorage.removeItem(`hrms_cache_${key}`);
      }
    }
  } catch {}

  return null;
}

export function setCachedData<T>(key: string, data: T): void {
  const record: CacheRecord<T> = { data, timestamp: Date.now() };
  inMemoryStore.set(key, record);
  try {
    sessionStorage.setItem(`hrms_cache_${key}`, JSON.stringify(record));
  } catch {}
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    inMemoryStore.clear();
    try {
      Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith('hrms_cache_')) {
          sessionStorage.removeItem(k);
        }
      });
    } catch {}
    return;
  }

  for (const k of inMemoryStore.keys()) {
    if (k.startsWith(keyPrefix)) {
      inMemoryStore.delete(k);
    }
  }
  try {
    Object.keys(sessionStorage).forEach(k => {
      if (k.startsWith(`hrms_cache_${keyPrefix}`)) {
        sessionStorage.removeItem(k);
      }
    });
  } catch {}
}

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
  forceRefresh: boolean = false
): Promise<T> {
  if (!forceRefresh) {
    const cached = getCachedData<T>(key, ttlMs);
    if (cached !== null && (!Array.isArray(cached) || cached.length > 0)) {
      return cached;
    }
  }
  const freshData = await fetcher();
  if (freshData !== null && freshData !== undefined && (!Array.isArray(freshData) || freshData.length > 0)) {
    setCachedData(key, freshData);
  }
  return freshData;
}
