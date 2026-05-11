import { getDatabase, ref, get, set, remove } from 'firebase/database';

/**
 * Performance System for BECE Peak Traffic
 * 
 * Designed to handle:
 * - BECE peak traffic spikes
 * - Viral WhatsApp sharing bursts
 * - Simultaneous payment requests
 * 
 * Strategies:
 * - Caching
 * - Database indexing
 * - Lightweight API design
 * - Load balancing approach
 */

interface CacheEntry {
  value: any;
  expiresAt: number;
  createdAt: number;
  hitCount: number;
  lastAccessed: number;
}

/**
 * In-memory cache with TTL
 * For production, use Redis or similar distributed cache
 */
export class CacheManager {
  private static cache = new Map<string, CacheEntry>();
  private static maxSize = 1000; // Maximum cache entries
  private static cleanupInterval = 60000; // Cleanup every minute

  static {
    // Start cleanup interval
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * Get value from cache
   */
  static async get(key: string): Promise<any | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access stats
    entry.hitCount++;
    entry.lastAccessed = Date.now();

    return entry.value;
  }

  /**
   * Set value in cache
   */
  static async set(key: string, value: any, ttl: number = 300000): Promise<void> {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
      hitCount: 0,
      lastAccessed: Date.now()
    });
  }

  /**
   * Delete entry from cache
   */
  static async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  static async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Cleanup expired entries
   */
  private static cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  static getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitCount: Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hitCount, 0)
    };
  }
}

/**
 * Database cache layer
 * Caches frequently accessed database queries
 */
export class DatabaseCache {
  private static cache = new Map<string, { value: any; expiresAt: number }>();

  /**
   * Get user premium status with caching
   */
  static async getUserPremiumStatus(db: any, userId: string): Promise<any> {
    const cacheKey = `user_premium_${userId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    // Fetch from database
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);

    const userData = snapshot.exists() ? snapshot.val() : null;

    // Cache for 5 minutes
    this.cache.set(cacheKey, {
      value: userData,
      expiresAt: Date.now() + 300000
    });

    return userData;
  }

  /**
   * Invalidate cache for specific user
   */
  static invalidateUser(userId: string): void {
    this.cache.delete(`user_premium_${userId}`);
  }

  /**
   * Clear all cache
   */
  static clear(): void {
    this.cache.clear();
  }
}

/**
 * Query optimization helper
 */
export class QueryOptimizer {
  /**
   * Batch fetch multiple user records
   */
  static async batchFetchUsers(db: any, userIds: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    // Fetch in parallel
    const promises = userIds.map(async (userId) => {
      const userRef = ref(db, `users/${userId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        results.set(userId, snapshot.val());
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Paginated query helper
   */
  static async paginatedQuery(
    db: any,
    path: string,
    pageSize: number = 50,
    startAfter?: string
  ): Promise<{ data: any[]; nextPageToken?: string }> {
    const refPath = ref(db, path);
    const snapshot = await get(refPath);

    if (!snapshot.exists()) {
      return { data: [] };
    }

    const data = Object.entries(snapshot.val());
    const startIndex = startAfter ? data.findIndex(([key]) => key === startAfter) + 1 : 0;
    const paginatedData = data.slice(startIndex, startIndex + pageSize);

    return {
      data: paginatedData.map(([key, value]) => ({ key, ...(value as Record<string, unknown>) })),
      nextPageToken: startIndex + pageSize < data.length ? paginatedData[paginatedData.length - 1][0] : undefined
    };
  }
}

/**
 * Request queue for high-traffic scenarios
 */
export class RequestQueue {
  private static queues = new Map<string, Array<() => Promise<any>>>();
  private static processing = new Map<string, boolean>();
  private static concurrencyLimit = 10;

  /**
   * Add request to queue
   */
  static async enqueue(queueName: string, request: () => Promise<any>): Promise<any> {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }

    const queue = this.queues.get(queueName)!;

    return new Promise((resolve, reject) => {
      queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue(queueName);
    });
  }

  /**
   * Process queue with concurrency limit
   */
  private static async processQueue(queueName: string) {
    if (this.processing.get(queueName)) {
      return;
    }

    this.processing.set(queueName, true);

    const queue = this.queues.get(queueName);
    if (!queue) {
      this.processing.set(queueName, false);
      return;
    }

    const activeRequests: Promise<any>[] = [];

    while (queue.length > 0 && activeRequests.length < this.concurrencyLimit) {
      const request = queue.shift();
      if (request) {
        const promise: Promise<any> = request().finally(() => {
          activeRequests.splice(activeRequests.indexOf(promise), 1);
          this.processQueue(queueName);
        });
        activeRequests.push(promise);
      }
    }

    if (activeRequests.length === 0) {
      this.processing.set(queueName, false);
    }
  }

  /**
   * Get queue statistics
   */
  static getQueueStats(queueName: string) {
    const queue = this.queues.get(queueName);
    return {
      pending: queue?.length || 0,
      processing: this.processing.get(queueName) ? 1 : 0
    };
  }
}

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();

  /**
   * Record metric
   */
  static recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(value);

    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
  }

  /**
   * Get metric statistics
   */
  static getMetricStats(name: string) {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  /**
   * Get all metrics
   */
  static getAllMetrics() {
    const stats: Record<string, any> = {};
    for (const [name] of this.metrics.entries()) {
      stats[name] = this.getMetricStats(name);
    }
    return stats;
  }

  /**
   * Clear metrics
   */
  static clearMetrics(): void {
    this.metrics.clear();
  }
}

/**
 * Load balancer helper
 */
export class LoadBalancer {
  private static endpoints: string[] = [];
  private static currentIndex = 0;

  /**
   * Set available endpoints
   */
  static setEndpoints(endpoints: string[]): void {
    this.endpoints = endpoints;
  }

  /**
   * Get next endpoint (round-robin)
   */
  static getNextEndpoint(): string | null {
    if (this.endpoints.length === 0) {
      return null;
    }

    const endpoint = this.endpoints[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.endpoints.length;
    return endpoint;
  }

  /**
   * Get random endpoint
   */
  static getRandomEndpoint(): string | null {
    if (this.endpoints.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * this.endpoints.length);
    return this.endpoints[randomIndex];
  }
}

/**
 * Database connection pool simulation
 * In production, use connection pooling for Firebase or migrate to PostgreSQL
 */
export class ConnectionPool {
  private static maxConnections = 20;
  private static activeConnections = 0;

  /**
   * Acquire connection
   */
  static async acquire(): Promise<boolean> {
    if (this.activeConnections >= this.maxConnections) {
      // Wait for available connection
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.acquire();
    }

    this.activeConnections++;
    return true;
  }

  /**
   * Release connection
   */
  static release(): void {
    if (this.activeConnections > 0) {
      this.activeConnections--;
    }
  }

  /**
   * Get pool statistics
   */
  static getStats() {
    return {
      active: this.activeConnections,
      max: this.maxConnections,
      available: this.maxConnections - this.activeConnections
    };
  }
}

/**
 * Performance optimization middleware
 */
export class PerformanceMiddleware {
  /**
   * Cache frequently accessed data
   */
  static async withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 300000
  ): Promise<T> {
    const cached = await CacheManager.get(key);
    if (cached !== null) {
      return cached as T;
    }

    const data = await fetcher();
    await CacheManager.set(key, data, ttl);
    return data;
  }

  /**
   * Measure and record performance
   */
  static async measure<T>(
    metricName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - start;
      PerformanceMonitor.recordMetric(metricName, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      PerformanceMonitor.recordMetric(`${metricName}_error`, duration);
      throw error;
    }
  }

  /**
   * Retry with exponential backoff
   */
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }
}

/**
 * BECE peak traffic preparation
 */
export class PeakTrafficPreparation {
  /**
   * Pre-warm cache with frequently accessed data
   */
  static async prewarmCache(db: any): Promise<void> {
    // Cache premium user statuses
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
      const users = snapshot.val();
      const premiumUsers = Object.entries(users).filter(([_, user]) => (user as any).isPremium);

      for (const [userId, userData] of premiumUsers) {
        await CacheManager.set(`user_premium_${userId}`, userData, 300000);
      }
    }
  }

  /**
   * Scale up database connections
   */
  static scaleUpConnections(): void {
    ConnectionPool['maxConnections'] = 50;
  }

  /**
   * Scale down database connections
   */
  static scaleDownConnections(): void {
    ConnectionPool['maxConnections'] = 20;
  }

  /**
   * Enable aggressive caching
   */
  static enableAggressiveCaching(): void {
    // Increase cache size and TTL
    CacheManager['maxSize'] = 5000;
  }

  /**
   * Disable aggressive caching
   */
  static disableAggressiveCaching(): void {
    CacheManager['maxSize'] = 1000;
  }
}

export default {
  CacheManager,
  DatabaseCache,
  QueryOptimizer,
  RequestQueue,
  PerformanceMonitor,
  LoadBalancer,
  ConnectionPool,
  PerformanceMiddleware,
  PeakTrafficPreparation
};
