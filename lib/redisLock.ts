
// api/lib/redisLock.ts
//
// Distributed locking for serverless functions using Upstash Redis (REST API).
// This exists specifically because Vercel functions are not a single long-running
// process — an in-memory mutex would NOT serialize requests handled by different
// function instances. Upstash's REST-based client works correctly here because
// every "acquire" is a real network call to a shared Redis instance, not a local
// variable.
//
// Requires env vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
// (from your Upstash dashboard, or `vercel env pull` if using the Vercel-Upstash integration)

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// How long a lock is held before it auto-expires (safety net if a function crashes
// mid-operation and never reaches the release step). Must be comfortably longer than
// the worst-case Airtable round-trip (ledger write + stock write) but short enough
// that a crash doesn't wedge that product/branch for long.
const LOCK_TTL_MS = 8_000;

// How long a caller is willing to wait for a busy lock before giving up.
const ACQUIRE_MAX_WAIT_MS = 6_000;
const ACQUIRE_RETRY_DELAY_MS = 150;

export class LockAcquisitionError extends Error {
  constructor(key: string) {
    super(`Could not acquire inventory lock for "${key}" — resource busy, please retry.`);
    this.name = 'LockAcquisitionError';
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function acquireLock(key: string): Promise<string> {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const deadline = Date.now() + ACQUIRE_MAX_WAIT_MS;

  while (Date.now() < deadline) {
    // SET key value NX PX ttl — succeeds only if the key doesn't already exist.
    const acquired = await redis.set(key, token, { nx: true, px: LOCK_TTL_MS });
    if (acquired) return token;
    await sleep(ACQUIRE_RETRY_DELAY_MS);
  }

  throw new LockAcquisitionError(key);
}

async function releaseLock(key: string, token: string): Promise<void> {
  // Only delete the key if we still own it. Without this check, a slow operation
  // whose lock already expired could delete a *different* caller's active lock.
  const current = await redis.get<string>(key);
  if (current === token) {
    await redis.del(key);
  }
}

export const lockKeyForStock = (businessUnitId: string, productId: string) =>
  `lock:inventory:${businessUnitId}:${productId}`;

/** Run `fn` while holding the lock for a single (businessUnitId, productId) pair. */
export async function withInventoryLock<T>(
  businessUnitId: string,
  productId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = lockKeyForStock(businessUnitId, productId);
  const token = await acquireLock(key);
  try {
    return await fn();
  } finally {
    await releaseLock(key, token);
  }
}

/**
 * Run `fn` while holding locks for MULTIPLE (businessUnitId, productId) pairs at once
 * (used for transfers, which touch a source and a destination row together).
 *
 * Locks are always acquired in a fixed sorted order, regardless of the order the caller
 * passes them in. This is what prevents deadlock: if two transfers move stock in opposite
 * directions between the same two branches at the same time, both will try to acquire
 * locks in the SAME order, so one always wins the first lock and proceeds — neither can
 * end up waiting on the other forever.
 */
export async function withInventoryLocks<T>(
  pairs: Array<{ businessUnitId: string; productId: string }>,
  fn: () => Promise<T>,
): Promise<T> {
  const sortedKeys = Array.from(
    new Set(pairs.map((p) => lockKeyForStock(p.businessUnitId, p.productId))),
  ).sort();

  const heldTokens: string[] = [];
  try {
    for (const key of sortedKeys) {
      heldTokens.push(await acquireLock(key));
    }
    return await fn();
  } finally {
    for (let i = 0; i < heldTokens.length; i++) {
      await releaseLock(sortedKeys[i], heldTokens[i]).catch(() => {
        // Best-effort release; the TTL will clean it up even if this fails.
      });
    }
  }
}