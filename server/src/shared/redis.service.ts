
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: '127.0.0.1',
      port: 6379,
      lazyConnect: false,
    });
  }

  async get<T = any>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      // Corrupted / non-JSON cache entry — treat as a cache miss rather than
      // crashing the caller.
      this.logger.warn(`Failed to parse cached value for key "${key}", treating as cache miss`);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  /** Supprime une seule clé (ex: invalidation ciblée après une écriture) */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /** Supprime toutes les clés correspondant à un préfixe (ex: "dashboard:stats:*") */
  async invalidatePrefix(prefix: string): Promise<void> {
    const stream = this.client.scanStream({ match: `${prefix}*`, count: 100 });
    const pipeline = this.client.pipeline();
    let found = false;
    for await (const keys of stream) {
      if (keys.length) {
        found = true;
        keys.forEach((k: string) => pipeline.del(k));
      }
    }
    if (found) await pipeline.exec();
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}