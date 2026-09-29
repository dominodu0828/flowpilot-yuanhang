/**
 * Lightweight per-process limit for expensive model calls. Production
 * multi-instance deployments should replace this with a shared store.
 */
const WINDOW_MS = 5 * 60 * 1000;
// Shared demo accounts are used by reviewers, so allow a reasonable five-minute burst.
const MAX_REQUESTS = 40;
const buckets = new Map<string, { count: number; resetAt: number }>();

export function takeChatRequest(userId: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = buckets.get(userId);
  if (!current || now >= current.resetAt) {
    buckets.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  current.count += 1;
  return {
    allowed: current.count <= MAX_REQUESTS,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}
