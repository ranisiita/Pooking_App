/**
 * Fetch with automatic retry and incremental backoff for transient infrastructure
 * errors (cold starts on free-tier hosting, e.g. Render free plan).
 *
 * Only 502 / 503 / 504 responses are retried.  Any other status (200, 400, 401,
 * 404, 422 …) is returned immediately without delay.  After exhausting all retries
 * the last response is returned as-is so the caller's existing `!res.ok` logic
 * continues to work unchanged.
 *
 * Network exceptions are intentionally NOT caught here; each service method's
 * try/catch handles them.
 *
 * ─── Backoff schedule ────────────────────────────────────────────────────────
 *  502  (service likely asleep — needs time to boot)   →  5 s / 10 s / 15 s
 *  503 / 504  (service awake but overloaded / slow)    →  3 s /  5 s /  8 s
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @param url      - The URL to fetch.
 * @param options  - Standard RequestInit (method, headers, body …).
 * @param retries  - Maximum additional attempts after the first one (default 3).
 * @param onRetry  - Optional callback invoked before each retry.
 *                   Receives (attemptNumber: 1|2|3, statusCode: number).
 *                   Use this from screen components to surface a UI message on
 *                   the last attempt, e.g.:
 *                     fetchWithRetry(url, undefined, 3,
 *                       (n) => n === 3 && setSlowMessage(true))
 */

const RETRIABLE_STATUSES = new Set([502, 503, 504]);

// Incremental delays (ms) indexed by attempt number (1-based → index 0, 1, 2)
const BACKOFF_502    = [5_000, 10_000, 15_000]; // sleeping service
const BACKOFF_503_504 = [3_000,  5_000,  8_000]; // overloaded / slow service

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3,
  onRetry?: (attempt: number, status: number) => void,
): Promise<Response> {
  return _retry(url, options, retries, retries, onRetry);
}

async function _retry(
  url: string,
  options: RequestInit | undefined,
  retriesLeft: number,
  maxRetries: number,
  onRetry: ((attempt: number, status: number) => void) | undefined,
): Promise<Response> {
  const res = await fetch(url, options);

  if (!RETRIABLE_STATUSES.has(res.status) || retriesLeft <= 0) {
    return res;
  }

  const attempt = maxRetries - retriesLeft + 1; // 1, 2, 3 …
  const idx     = attempt - 1;
  const delayMs = res.status === 502
    ? (BACKOFF_502[idx]    ?? 15_000)
    : (BACKOFF_503_504[idx] ??  8_000);

  console.warn(
    `[fetchWithRetry] ${res.status} — retry ${attempt}/${maxRetries} in ${delayMs / 1000}s · ${url}`,
  );

  onRetry?.(attempt, res.status);

  await sleep(delayMs);
  return _retry(url, options, retriesLeft - 1, maxRetries, onRetry);
}
