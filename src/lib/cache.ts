/**
 * High-Performance Multi-Tier Client Cache Engine (L1 RAM + L2 Persistent Storage)
 * ---------------------------------------------------------------------------------
 * 1. L1 RAM Cache (In-Memory Map): Sub-millisecond (0ms) synchronous access without JSON parsing overhead.
 * 2. L2 Persistent Cache (localStorage): Retains state across page reloads with configurable TTL.
 * 3. Tag & Prefix Invalidation: Purges all variants (e.g. parameterized queries like /api/employees?dept=...) instantly.
 * 4. Cross-Tab & Cross-Component Event Bus: Dispatches instant events on any DB mutation to refresh UI with 0 latency.
 */

const CURRENT_CACHE_VERSION = 'v3_production_clean';
const CACHE_VERSION_KEY = 'hrms_app_cache_version';
const CACHE_PREFIX = 'hrms_v3_cache_';
const DEV_BYPASS_KEY = 'hrms_dev_cache_bypassed';
// In development, keep TTL short (3s) so direct DB edits reflect immediately; in production, keep 5 minutes.
export const DEFAULT_TTL_MS = process.env.NODE_ENV === 'development' ? 3 * 1000 : 5 * 60 * 1000;

// Auto-purge any stale pre-update caches stored in user's browser localStorage
if (typeof window !== 'undefined') {
  try {
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    if (storedVersion !== CURRENT_CACHE_VERSION) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('hrms_cache_') || key.startsWith('hrms_v') || (key.startsWith('api_') && key.includes('leaves')))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
    }
  } catch {}
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

// L1 In-Memory Fast Cache Store
const memoryCache = new Map<string, CacheEntry>();
const tagToKeysMap = new Map<string, Set<string>>();

// Cross-tab broadcast channel for instantaneous sync across tabs
let syncBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncBroadcastChannel = new BroadcastChannel('hrms_cache_sync_channel');
    syncBroadcastChannel.onmessage = (event) => {
      if (event.data?.type === 'INVALIDATE_TAGS') {
        localPurgeTags(event.data.tags, false);
      } else if (event.data?.type === 'INVALIDATE_PREFIX') {
        localPurgePrefix(event.data.prefix, false);
      } else if (event.data?.type === 'CLEAR_ALL') {
        localClearAll(false);
      }
    };
  } catch {}
}

/**
 * Checks if Dev Cache Bypass is active
 */
export function isDevCacheBypassed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(DEV_BYPASS_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Sets Dev Cache Bypass flag
 */
export function setDevCacheBypass(bypassed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEV_BYPASS_KEY, bypassed ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('hrms_cache_status_change', { detail: { bypassed } }));
  } catch (e) {
    console.error('Failed to set dev cache bypass:', e);
  }
}

/**
 * Retrieve cached data from L1 (Memory) or L2 (Storage)
 */
export function getCache<T = any>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  if (isDevCacheBypassed()) return null;

  const now = Date.now();

  // 1. Check L1 Memory Cache (0ms latency)
  const memEntry = memoryCache.get(key);
  if (memEntry) {
    if (now - memEntry.timestamp <= memEntry.ttl) {
      return memEntry.data as T;
    }
    // Expired in L1
    memoryCache.delete(key);
  }

  // 2. Check L2 LocalStorage
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    if (now - entry.timestamp > entry.ttl) {
      removeCache(key);
      return null;
    }

    // Populate L1 cache for subsequent 0ms hits
    memoryCache.set(key, entry);
    if (entry.tags && Array.isArray(entry.tags)) {
      entry.tags.forEach((tag) => {
        if (!tagToKeysMap.has(tag)) tagToKeysMap.set(tag, new Set());
        tagToKeysMap.get(tag)!.add(key);
      });
    }

    return entry.data;
  } catch (e) {
    removeCache(key);
    return null;
  }
}

/**
 * Store data into L1 (RAM) and L2 (Storage) with tags
 */
export function setCache<T = any>(
  key: string,
  data: T,
  ttlMs: number = DEFAULT_TTL_MS,
  tags: string[] = []
): void {
  if (typeof window === 'undefined') return;
  if (isDevCacheBypassed()) return;

  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
    tags,
  };

  // 1. Store in L1 RAM
  memoryCache.set(key, entry);

  // Index tags for rapid invalidation
  tags.forEach((tag) => {
    if (!tagToKeysMap.has(tag)) tagToKeysMap.set(tag, new Set());
    tagToKeysMap.get(tag)!.add(key);
  });

  // 2. Store in L2 LocalStorage
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch (e) {
    // If storage is full, purge expired items
    purgeExpiredCache();
    try {
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch {}
  }
}

/**
 * Remove a specific key from cache
 */
export function removeCache(key: string): void {
  if (typeof window === 'undefined') return;
  memoryCache.delete(key);
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch {}
}

/**
 * Invalidate all cache keys matching a prefix or pattern (e.g. 'api_/api/employees')
 */
export function invalidateCache(prefixOrKey: string): void {
  localPurgePrefix(prefixOrKey, true);
}

function localPurgePrefix(prefix: string, broadcast = true): void {
  if (typeof window === 'undefined') return;

  // 1. Clear from L1 RAM
  for (const key of memoryCache.keys()) {
    if (key.includes(prefix) || key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }

  // 2. Clear from L2 LocalStorage
  const fullPrefix = prefix.startsWith(CACHE_PREFIX) ? prefix : `${CACHE_PREFIX}${prefix}`;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.includes(prefix) || k.startsWith(fullPrefix))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}

  // 3. Dispatch reactive UI events
  window.dispatchEvent(new CustomEvent('hrms_cache_invalidated', { detail: { prefix } }));

  // 4. Broadcast to other tabs
  if (broadcast && syncBroadcastChannel) {
    try {
      syncBroadcastChannel.postMessage({ type: 'INVALIDATE_PREFIX', prefix });
    } catch {}
  }
}

/**
 * Invalidate cache by one or more semantic domain tags (e.g. ['employees', 'dashboard'])
 */
export function invalidateCacheTags(tags: string[]): void {
  localPurgeTags(tags, true);
}

function localPurgeTags(tags: string[], broadcast = true): void {
  if (typeof window === 'undefined' || !tags || tags.length === 0) return;

  const tagSet = new Set(tags);

  // 1. Purge from L1
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.tags && entry.tags.some((t) => tagSet.has(t))) {
      memoryCache.delete(key);
    }
  }

  // Purge indexed tag map
  tags.forEach((tag) => {
    const keys = tagToKeysMap.get(tag);
    if (keys) {
      keys.forEach((key) => {
        memoryCache.delete(key);
        try {
          localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        } catch {}
      });
      tagToKeysMap.delete(tag);
    }
  });

  // 2. Scan L2 Storage for tags
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const entry: CacheEntry = JSON.parse(raw);
            if (entry.tags && entry.tags.some((t) => tagSet.has(t))) {
              keysToRemove.push(k);
            }
          }
        } catch {}
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}

  // 3. Dispatch event to active UI components
  window.dispatchEvent(new CustomEvent('hrms_cache_invalidated', { detail: { tags } }));
  window.dispatchEvent(new CustomEvent('hrms_data_mutation', { detail: { tags, timestamp: Date.now() } }));

  // 4. Broadcast across tabs
  if (broadcast && syncBroadcastChannel) {
    try {
      syncBroadcastChannel.postMessage({ type: 'INVALIDATE_TAGS', tags });
    } catch {}
  }
}

/**
 * Clear all HRMS cache entries
 */
export function clearAllCache(): void {
  localClearAll(true);
}

function localClearAll(broadcast = true): void {
  if (typeof window === 'undefined') return;

  memoryCache.clear();
  tagToKeysMap.clear();

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(CACHE_PREFIX) || key.startsWith('hrms_cache_') || key.startsWith('hrms_v'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}

  window.dispatchEvent(new CustomEvent('hrms_cache_invalidated', { detail: { all: true } }));
  window.dispatchEvent(new CustomEvent('hrms_cache_status_change', { detail: { cleared: true } }));

  // Also clear server-side cache in background
  try {
    fetch('/api/dev/clear-cache', { method: 'POST' }).catch(() => {});
  } catch {}

  if (broadcast && syncBroadcastChannel) {
    try {
      syncBroadcastChannel.postMessage({ type: 'CLEAR_ALL' });
    } catch {}
  }
}

/**
 * Purge expired cache items
 */
export function purgeExpiredCache(): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();

  // Purge L1
  for (const [key, entry] of memoryCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      memoryCache.delete(key);
    }
  }

  // Purge L2
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const entry: CacheEntry = JSON.parse(raw);
            if (now - entry.timestamp > entry.ttl) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          localStorage.removeItem(key);
        }
      }
    }
  } catch {}
}
