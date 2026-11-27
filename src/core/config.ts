import { z } from 'zod';
import type { TokenProvider } from './auth.js';
import { DIPConfigurationError } from './errors.js';
import type { RetryConfig } from './retry.js';
import type { TransportAdapter } from './transport.js';

export type DIPEnvironment = 'production' | 'sandbox' | 'development';

export type DIPApiVersion = 'v1';

export interface DIPRequestContext {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  correlationId: string;
  attempt: number;
}

export interface DIPResponseContext {
  method: string;
  url: string;
  status: number;
  headers: Record<string, string>;
  correlationId: string;
  durationMs: number;
}

export interface DIPMiddleware {
  onRequest?: (context: DIPRequestContext) => void | Promise<void>;
  onResponse?: (context: DIPResponseContext) => void | Promise<void>;
  onError?: (error: unknown, context: DIPRequestContext) => void | Promise<void>;
}

export interface DIPLogger {
  debug?: (message: string, meta?: Record<string, unknown>) => void;
  warn?: (message: string, meta?: Record<string, unknown>) => void;
  error?: (message: string, meta?: Record<string, unknown>) => void;
}

export interface DIPClientConfig {
  /** Base URL of the DIP API gateway (e.g., https://api.digitalindiaproject.example). */
  baseUrl?: string;
  /** Alias for baseUrl for developer ergonomics. */
  baseURL?: string;
  /** Target environment hint. Production enforces HTTPS strictly. */
  environment?: DIPEnvironment;
  /** API contract version prefix. Currently only 'v1' is supported. */
  apiVersion?: DIPApiVersion;
  /** Default request timeout in milliseconds (default: 15000, max: 120000). */
  timeoutMs?: number;
  /** Alias for timeoutMs. */
  timeout?: number;
  /** Caller-supplied Bearer token provider. Never embed long-lived secrets in browser apps. */
  tokenProvider?: TokenProvider;
  /** Alias for tokenProvider. */
  getToken?: TokenProvider;
  /** Optional default headers attached to every request (excluding reserved security headers). */
  headers?: Record<string, string>;
  /** Optional custom user-agent string (applied only in non-browser runtimes). */
  userAgent?: string;
  /** Optional custom transport adapter (defaults to Fetch API). */
  transport?: TransportAdapter;
  /** Validate API responses against Zod schemas (default: true). */
  validateResponses?: boolean;
  /** Retry configuration for safe/idempotent requests. */
  retry?: Partial<RetryConfig>;
  /** Lifecycle hooks for diagnostics/observability. */
  middleware?: DIPMiddleware[];
  /** Optional structured logger (receives redacted metadata only). */
  logger?: DIPLogger;
  /** Explicit opt-in for plain HTTP baseUrl in local development/sandbox tests. */
  allowInsecureHttpInDev?: boolean;
}

const ConfigValidationSchema = z.object({
  baseUrl: z.string().trim().url('baseUrl must be a valid URL'),
  environment: z.enum(['production', 'sandbox', 'development']).default('production'),
  apiVersion: z.enum(['v1']).default('v1'),
  timeoutMs: z.number().int().positive().max(120_000).default(15_000),
  validateResponses: z.boolean().default(true),
  allowInsecureHttpInDev: z.boolean().default(false),
});

export interface ResolvedDIPClientConfig {
  baseUrl: string;
  apiBaseUrl: string;
  trustedOrigin: string;
  environment: DIPEnvironment;
  apiVersion: DIPApiVersion;
  timeoutMs: number;
  headers: Record<string, string>;
  userAgent?: string;
  validateResponses: boolean;
  allowInsecureHttpInDev: boolean;
}

const LOCAL_DEV_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function resolveClientConfig(config: DIPClientConfig): ResolvedDIPClientConfig {
  const rawBaseUrl = config.baseUrl ?? config.baseURL;
  if (!rawBaseUrl) {
    throw new DIPConfigurationError('DIPClient requires a baseUrl (or baseURL).');
  }

  let parsed;
  try {
    parsed = ConfigValidationSchema.parse({
      baseUrl: rawBaseUrl,
      environment: config.environment ?? 'production',
      apiVersion: config.apiVersion ?? 'v1',
      timeoutMs: config.timeoutMs ?? config.timeout ?? 15_000,
      validateResponses: config.validateResponses ?? true,
      allowInsecureHttpInDev: config.allowInsecureHttpInDev ?? false,
    });
  } catch (err) {
    throw new DIPConfigurationError(
      err instanceof Error ? err.message : 'Invalid DIPClient configuration.',
      err
    );
  }

  const url = new URL(parsed.baseUrl);
  if (url.username || url.password) {
    throw new DIPConfigurationError('baseUrl must not contain embedded username or password credentials.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new DIPConfigurationError('baseUrl protocol must be https: (or http: only in local dev).');
  }
  if (url.protocol !== 'https:') {
    const isLocalHost = LOCAL_DEV_HOSTS.has(url.hostname.toLowerCase());
    if (parsed.environment === 'production' || (!parsed.allowInsecureHttpInDev && !isLocalHost)) {
      throw new DIPConfigurationError(
        'DIPClient requires an HTTPS baseUrl unless environment is non-production and allowInsecureHttpInDev is true.'
      );
    }
  }

  const normalizedRoot = parsed.baseUrl.replace(/\/+$/, '');
  const versionSuffix = `/api/${parsed.apiVersion}`;
  const apiBaseUrl = normalizedRoot.endsWith(versionSuffix)
    ? normalizedRoot
    : `${normalizedRoot}${versionSuffix}`;

  const safeHeaders: Record<string, string> = {};
  if (config.headers) {
    for (const [k, v] of Object.entries(config.headers)) {
      if (k.toLowerCase() !== 'authorization') {
        safeHeaders[k] = v;
      }
    }
  }

  return {
    baseUrl: normalizedRoot,
    apiBaseUrl,
    trustedOrigin: url.origin,
    environment: parsed.environment,
    apiVersion: parsed.apiVersion,
    timeoutMs: parsed.timeoutMs,
    headers: safeHeaders,
    userAgent: config.userAgent,
    validateResponses: parsed.validateResponses,
    allowInsecureHttpInDev: parsed.allowInsecureHttpInDev,
  };
}
