/**
 * Client-Side Temporary Local Cache Engine with TTL & Dev-Mode Bypass
 * ------------------------------------------------------------------
 * Stores API responses & page states in localStorage with a configurable TTL (default: 2 hours).
 * Automatically purges expired cache entries on access.
 * Includes a Dev-Mode bypass toggle so developers can bypass caching during workflow/testing.
 */

const CACHE_PREFIX = 'hrms_cache_';
const DEV_BYPASS_KEY = 'hrms_dev_cache_bypassed';
export const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Checks if the dev team has enabled Cache Bypass mode
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
 * Sets the Dev Cache Bypass flag (true = bypass cache, false = enable cache)
 */
export function setDevCacheBypass(bypassed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEV_BYPASS_KEY, bypassed ? 'true' : 'false');
    // Dispatch custom event so UI components (Header toggle) re-render immediately
    window.dispatchEvent(new Event('hrms_cache_status_change'));
  } catch (e) {
    console.error('Failed to set dev cache bypass:', e);
  }
}

/**
 * Retrieve cached data if valid and unexpired
 */
export function getCache<T = any>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  if (isDevCacheBypassed()) return null;

  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    const now = Date.now();

    // Check if expired (timestamp + ttl < now)
    if (now - entry.timestamp > entry.ttl) {
      removeCache(key);
      return null;
    }

    return entry.data;
  } catch (e) {
    console.warn(`Failed to parse cache for key ${key}:`, e);
    removeCache(key);
    return null;
  }
}

/**
 * Store data into cache with TTL (default 2 hours)
 */
export function setCache<T = any>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  if (typeof window === 'undefined') return;
  if (isDevCacheBypassed()) return;

  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch (e) {
    console.warn(`Failed to set cache for key ${key}:`, e);
  }
}

/**
 * Remove a specific item from cache
 */
export function removeCache(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch (e) {
    console.error(`Failed to remove cache for key ${key}:`, e);
  }
}

/**
 * Purge all HRMS cache entries from localStorage
 */
export function clearAllCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new Event('hrms_cache_status_change'));
  } catch (e) {
    console.error('Failed to clear cache:', e);
  }
}

/**
 * Auto-clean all expired cache entries in storage
 */
export function purgeExpiredCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const now = Date.now();
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
  } catch (e) {
    console.warn('Failed to purge expired cache:', e);
  }
}
