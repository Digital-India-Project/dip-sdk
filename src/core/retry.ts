import { DIPAbortError, DIPAPIError, DIPNetworkError, DIPTimeoutError } from './errors.js';

export interface RetryConfig {
  /** Maximum retry attempts for safe/idempotent requests (default: 2). */
  maxRetries: number;
  /** Initial backoff delay in milliseconds (default: 250). */
  baseDelayMs: number;
  /** Maximum backoff delay cap in milliseconds (default: 5000). */
  maxDelayMs: number;
  /** Add random jitter to avoid retry storms (default: true). */
  jitter: boolean;
  /** Honor server Retry-After header when present (default: true). */
  respectRetryAfter: boolean;
  /** Allow retrying POST/PUT/PATCH/DELETE only when Idempotency-Key is present AND operation explicitly permits it (default: true). */
  retryIdempotentMutations: boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelayMs: 250,
  maxDelayMs: 5000,
  jitter: true,
  respectRetryAfter: true,
  retryIdempotentMutations: true,
};

const SAFE_READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);

export function parseRetryAfterMs(headerValue: string | undefined, maxCapMs = 60_000): number | undefined {
  if (!headerValue) return undefined;
  const trimmed = headerValue.trim();
  if (!trimmed) return undefined;

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(maxCapMs, Math.round(seconds * 1000));
  }

  const parsedDateMs = Date.parse(trimmed);
  if (Number.isFinite(parsedDateMs)) {
    const delta = parsedDateMs - Date.now();
    if (delta > 0) {
      return Math.min(maxCapMs, delta);
    }
    return 0;
  }

  return undefined;
}

export function computeBackoffDelayMs(
  attempt: number,
  config: RetryConfig,
  retryAfterMs?: number
): number {
  if (config.respectRetryAfter && retryAfterMs !== undefined && retryAfterMs >= 0) {
    return Math.min(Math.max(retryAfterMs, 0), 60_000);
  }
  const exponential = Math.min(config.maxDelayMs, config.baseDelayMs * Math.pow(2, attempt));
  if (!config.jitter) {
    return exponential;
  }
  const factor = 0.5 + Math.random() * 0.5;
  return Math.round(exponential * factor);
}

export function isRequestEligibleForRetry(params: {
  method: string;
  attempt: number;
  config: RetryConfig;
  error: unknown;
  hasIdempotencyKey: boolean;
  allowIdempotentRetry?: boolean;
  signal?: AbortSignal;
}): boolean {
  const { method, attempt, config, error, hasIdempotencyKey, allowIdempotentRetry, signal } = params;

  if (signal?.aborted) {
    return false;
  }
  if (attempt >= config.maxRetries) {
    return false;
  }
  if (error instanceof DIPAbortError) {
    return false;
  }

  const upperMethod = method.toUpperCase();
  const isSafeRead = SAFE_READ_METHODS.has(upperMethod);

  if (!isSafeRead) {
    if (!config.retryIdempotentMutations || !hasIdempotencyKey || allowIdempotentRetry === false) {
      return false;
    }
  }

  if (error instanceof DIPNetworkError || error instanceof DIPTimeoutError) {
    return true;
  }

  if (error instanceof DIPAPIError) {
    if (error.status !== undefined && RETRYABLE_STATUS_CODES.has(error.status)) {
      return true;
    }
    return false;
  }

  return false;
}

export function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DIPAbortError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DIPAbortError());
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
