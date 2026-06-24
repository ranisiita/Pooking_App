/**
 * Fetch with automatic retry for transient infrastructure errors (cold starts on
 * free-tier hosting). Only 502 / 503 / 504 responses are retried — any other
 * status (200, 400, 401, 404, 422 …) is returned immediately as-is.
 *
 * Network exceptions are intentionally NOT caught here; the try/catch that
 * already exists in each service method handles them.
 *
 * @param url      - The URL to fetch.
 * @param options  - Standard RequestInit (method, headers, body …).
 * @param retries  - Maximum number of additional attempts after the first one (default 2).
 * @param delayMs  - Milliseconds to wait between attempts (default 3000).
 */

const RETRIABLE_STATUSES = new Set([502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 2,
  delayMs = 3000,
): Promise<Response> {
  const res = await fetch(url, options);

  if (!RETRIABLE_STATUSES.has(res.status) || retries <= 0) {
    return res;
  }

  console.warn(
    `[fetchWithRetry] ${res.status} from ${url} — retrying in ${delayMs}ms (${retries} attempt(s) left)`,
  );

  await sleep(delayMs);
  return fetchWithRetry(url, options, retries - 1, delayMs);
}
