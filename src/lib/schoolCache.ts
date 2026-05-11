/**
 * schoolCache.ts
 * TTL-based in-memory cache for Firebase school data.
 *
 * Why: Both /api/predict and /api/schools/suggest read from Firebase on every request.
 * At scale (peak BECE traffic / viral spikes) this creates O(schools × requests) Firebase
 * reads per minute. School data changes at most once per BECE cycle.
 *
 * This cache keeps warm instances fast without requiring external infrastructure (Redis).
 * In a multi-instance deployment, each instance has its own warm cache — acceptable since
 * school data is static and TTL ensures eventual consistency after any data updates.
 *
 * TTL: 5 minutes. Upgrade to Vercel KV / Upstash Redis for cross-instance coherence.
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SchoolDataCache {
  private readonly byId   = new Map<string, CacheEntry<any>>();
  private allEntry: CacheEntry<any[]> | null = null;

  /**
   * Thundering-herd lock for the full-catalogue fetch.
   *
   * Problem: Under viral load, 200 concurrent requests can all miss the cache
   * simultaneously and each fire a separate `get(ref(rtdb, 'schools'))`.
   * That's 200 unnecessary Firebase reads in a single second.
   *
   * Fix: Store the in-flight Promise here. Every concurrent request that misses
   * the cache awaits the same Promise — Firebase is called exactly once.
   * Lock is released (set to null) after success OR error so future requests
   * can retry after a failure.
   */
  private fetchAllLock: Promise<any[]> | null = null;

  /**
   * Wrap a full-catalogue Firebase fetch with the thundering-herd lock.
   * Usage: `const schools = await schoolCache.fetchAllWithLock(() => fetchFromFirebase());`
   */
  async fetchAllWithLock(fetcher: () => Promise<any[]>): Promise<any[]> {
    const cached = this.getAll();
    if (cached) return cached;

    // Already in-flight — join the existing promise instead of spawning a new read
    if (this.fetchAllLock) return this.fetchAllLock;

    this.fetchAllLock = fetcher()
      .then(schools => {
        this.setAll(schools);
        this.fetchAllLock = null;
        return schools;
      })
      .catch(err => {
        this.fetchAllLock = null; // Release lock so next request can retry
        throw err;
      });

    return this.fetchAllLock;
  }

  /** Get a single school by Firebase key. Returns null on cache miss or expiry. */
  getById(schoolId: string): any | null {
    const entry = this.byId.get(schoolId);
    if (!entry || Date.now() > entry.expiresAt) {
      this.byId.delete(schoolId);
      return null;
    }
    return entry.data;
  }

  /** Store a single Firebase school document. */
  setById(schoolId: string, data: any): void {
    this.byId.set(schoolId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  /** Get the full school catalogue. Returns null on cache miss or expiry. */
  getAll(): any[] | null {
    if (!this.allEntry || Date.now() > this.allEntry.expiresAt) {
      this.allEntry = null;
      return null;
    }
    return this.allEntry.data;
  }

  /**
   * Store the full catalogue and populate individual entries in one pass.
   * Each school object must have an `id` field.
   */
  setAll(schools: any[]): void {
    const expiresAt = Date.now() + CACHE_TTL_MS;
    this.allEntry = { data: schools, expiresAt };
    for (const school of schools) {
      if (school.id) {
        this.byId.set(school.id, { data: school, expiresAt });
      }
    }
  }

  /** Invalidate one entry or the whole cache (call after a data update). */
  invalidate(schoolId?: string): void {
    if (schoolId) {
      this.byId.delete(schoolId);
    } else {
      this.byId.clear();
      this.allEntry = null;
    }
  }

  /** Diagnostic: number of individually cached school entries. */
  get size(): number {
    return this.byId.size;
  }
}

// Module-level singleton — shared across all requests in the same Node.js instance.
export const schoolCache = new SchoolDataCache();
