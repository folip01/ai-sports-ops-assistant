import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

const redis = new Redis({
    retryStrategy: () => null,
    lazyConnect: true,
});

let redisAvailable = true;

redis.on('error', (err) => {
    if (redisAvailable) {
        console.error('[gateway] Redis unavailable, rate limiting is temporarily disabled:', err.message);
    }
    redisAvailable = false;
});

redis.on('connect', () => {
    redisAvailable = true;
    console.log('[gateway] Redis connected, rate limiting is active.');
});

redis.connect().catch(() => {
    redisAvailable = false;
});

const BUCKET_CAPACITY = 20;
const REFILL_RATE_PER_SEC = 1;

export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!redisAvailable) {
        next();
        return;
    }

    const apiKey = req.header('X-API-Key') ?? 'anonymous';
    const key = `ratelimit:${apiKey}`;

    try {
        const now = Date.now();
        const bucketRaw = await redis.get(key);
        let tokens = BUCKET_CAPACITY;
        let lastRefill = now;

        if (bucketRaw) {
            const bucket = JSON.parse(bucketRaw);
            const elapsedSec = (now - bucket.lastRefill) / 1000;
            tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + elapsedSec * REFILL_RATE_PER_SEC);
            lastRefill = now;
        }

        if (tokens < 1) {
            res.status(429).json({ error: 'Rate limit exceeded, please slow down.' });
            return;
        }

        tokens -= 1;
        await redis.set(key, JSON.stringify({ tokens, lastRefill }), 'EX', 60);
        next();
    } catch (err) {
        console.error('[gateway] Rate limit check failed, allowing request through:', (err as Error).message);
        next();
    }
}