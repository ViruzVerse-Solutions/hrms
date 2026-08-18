/**
 * High-Speed Server-Side Memory Cache Engine with Tag-Based Invalidation
 * ----------------------------------------------------------------------
 * Provides sub-millisecond memoization for database aggregations, master records,
 * and high-frequency read endpoints. Automatically purges matching domains on write mutations.
 */

interface ServerCacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
}

// In development, keep TTL short (3s) so manual DB edits reflect quickly; in production, keep 10 minutes.
const DEFAULT_SERVER_TTL_MS = process.env.NODE_ENV === 'development' ? 3 * 1000 : 10 * 60 * 1000;

class ServerCacheEngine {
  private store = new Map<string, ServerCacheEntry>();
  private tagMap = new Map<string, Set<string>>();

  /**
   * Retrieve cached value if valid and unexpired
   */
  get<T = any>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const now = Date.now();
    const effectiveTtl = process.env.NODE_ENV === 'development' ? Math.min(entry.ttl, 3000) : entry.ttl;
    if (now - entry.timestamp > effectiveTtl) {
      this.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store value with TTL and semantic domain tags
   */
  set<T = any>(
    key: string,
    data: T,
    ttlMs: number = DEFAULT_SERVER_TTL_MS,
    tags: string[] = []
  ): void {
    const effectiveTtl = process.env.NODE_ENV === 'development' ? Math.min(ttlMs, 3000) : ttlMs;
    const entry: ServerCacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: effectiveTtl,
      tags,
    };

    this.store.set(key, entry);

    // Index tags
    tags.forEach((tag) => {
      if (!this.tagMap.has(tag)) this.tagMap.set(tag, new Set());
      this.tagMap.get(tag)!.add(key);
    });
  }

  /**
   * Fetch with cache helper (returns cached or computes & caches)
   */
  async fetchWithCache<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = DEFAULT_SERVER_TTL_MS,
    tags: string[] = []
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    if (fresh !== undefined && fresh !== null) {
      this.set(key, fresh, ttlMs, tags);
    }
    return fresh;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): void {
    const entry = this.store.get(key);
    if (entry && entry.tags) {
      entry.tags.forEach((tag) => {
        const keys = this.tagMap.get(tag);
        if (keys) keys.delete(key);
      });
    }
    this.store.delete(key);
  }

  /**
   * Invalidate all entries associated with one or more tags
   */
  invalidateTags(tags: string[]): void {
    if (!tags || tags.length === 0) return;

    tags.forEach((tag) => {
      const keys = this.tagMap.get(tag);
      if (keys) {
        keys.forEach((key) => {
          this.store.delete(key);
        });
        this.tagMap.delete(tag);
      }
    });

    // Also scan entries just in case
    const tagSet = new Set(tags);
    for (const [key, entry] of this.store.entries()) {
      if (entry.tags && entry.tags.some((t) => tagSet.has(t))) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Invalidate all keys matching a prefix or substring
   */
  invalidate(prefixOrKey: string): void {
    for (const key of this.store.keys()) {
      if (key.includes(prefixOrKey) || key.startsWith(prefixOrKey)) {
        this.delete(key);
      }
    }
  }

  /**
   * Purge entire server cache
   */
  clear(): void {
    this.store.clear();
    this.tagMap.clear();
  }
}

// Global Singleton for Next.js Server Runtime
const globalForServerCache = globalThis as unknown as { serverCache: ServerCacheEngine | undefined };

export const serverCache = globalForServerCache.serverCache ?? new ServerCacheEngine();

if (process.env.NODE_ENV !== 'production') {
  globalForServerCache.serverCache = serverCache;
}
