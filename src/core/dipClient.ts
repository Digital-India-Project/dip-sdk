import {
  ApiErrorEnvelopeSchema,
  createSuccessEnvelopeSchema,
  type ApiSuccessEnvelope,
  type RateLimitInfo,
} from '../contracts/common.js';
import {
  ApplicationsClient,
  WorkflowClient,
} from '../resources/applications.js';
import { ProductsClient, ServicesClient } from '../resources/catalogue.js';
import { DocumentsClient } from '../resources/documents.js';
import { HealthClient } from '../resources/health.js';
import { IntegrationsClient } from '../resources/integrations.js';
import { PaymentsClient } from '../resources/payments.js';
import { SandboxAuthClient } from '../resources/sandbox.js';
import type {
  DIPRequestExecutor,
  ExecuteEnvelopeRequest,
  ExecuteRawRequest,
} from '../resources/types.js';
import { WebhooksClient } from '../resources/webhooks.js';
import {
  attemptTokenRefresh,
  isTrustedOriginForToken,
  resolveAccessToken,
  type TokenProvider,
} from './auth.js';
import {
  resolveClientConfig,
  type DIPClientConfig,
  type DIPLogger,
  type DIPMiddleware,
  type DIPRequestContext,
  type DIPResponseContext,
  type ResolvedDIPClientConfig,
} from './config.js';
import {
  DIPAuthenticationError,
  DIPUnexpectedResponseError,
  DIPValidationError,
  mapHttpErrorToDIPAPIError,
} from './errors.js';
import { redactHeaders, redactUrl } from './redaction.js';
import {
  computeBackoffDelayMs,
  DEFAULT_RETRY_CONFIG,
  isRequestEligibleForRetry,
  parseRetryAfterMs,
  sleepWithAbort,
  type RetryConfig,
} from './retry.js';
import { FetchTransport, type TransportAdapter } from './transport.js';

const IDEMPOTENCY_KEY_REGEX = /^[a-zA-Z0-9_-]{8,128}$/;
const CORRELATION_ID_REGEX = /^[a-zA-Z0-9_-]{4,64}$/;

function createRandomId(prefix: string): string {
  const randomPart =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}_${randomPart.slice(0, 24)}`;
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

function extractRateLimitInfo(headers: Record<string, string>): RateLimitInfo {
  const limit = Number(headers['x-ratelimit-limit']);
  const remaining = Number(headers['x-ratelimit-remaining']);
  const reset = Number(headers['x-ratelimit-reset']);
  const retryAfterMs = parseRetryAfterMs(headers['retry-after']);
  return {
    limit: Number.isFinite(limit) ? limit : undefined,
    remaining: Number.isFinite(remaining) ? remaining : undefined,
    resetEpochSeconds: Number.isFinite(reset) ? reset : undefined,
    retryAfterSeconds: retryAfterMs !== undefined ? Math.ceil(retryAfterMs / 1000) : undefined,
  };
}

export class DIPClient implements DIPRequestExecutor {
  public readonly config: ResolvedDIPClientConfig;
  public readonly health: HealthClient;
  public readonly services: ServicesClient;
  public readonly products: ProductsClient;
  public readonly applications: ApplicationsClient;
  public readonly workflow: WorkflowClient;
  public readonly documents: DocumentsClient;
  public readonly payments: PaymentsClient;
  public readonly webhooks: WebhooksClient;
  public readonly integrations: IntegrationsClient;
  public readonly sandbox: SandboxAuthClient;

  private readonly tokenProvider?: TokenProvider;
  private readonly transport: TransportAdapter;
  private readonly retryConfig: RetryConfig;
  private readonly middleware: DIPMiddleware[];
  private readonly logger?: DIPLogger;
  private lastRateLimit?: RateLimitInfo;

  constructor(config: DIPClientConfig) {
    this.config = resolveClientConfig(config);
    this.tokenProvider = config.tokenProvider ?? config.getToken;
    this.transport = config.transport ?? new FetchTransport();
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry };
    this.middleware = config.middleware ?? [];
    this.logger = config.logger;

    this.health = new HealthClient(this);
    this.services = new ServicesClient(this);
    this.products = new ProductsClient(this);
    this.applications = new ApplicationsClient(this);
    this.workflow = new WorkflowClient(this);
    this.documents = new DocumentsClient(this);
    this.payments = new PaymentsClient(this);
    this.webhooks = new WebhooksClient(this);
    this.integrations = new IntegrationsClient(this);
    this.sandbox = new SandboxAuthClient(this, this.config.environment);
  }

  public getOrigin(): string {
    return this.config.trustedOrigin;
  }

  public getLastRateLimit(): RateLimitInfo | undefined {
    return this.lastRateLimit ? { ...this.lastRateLimit } : undefined;
  }

  public generateIdempotencyKey(prefix = 'idem'): string {
    const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 16) || 'idem';
    return createRandomId(cleanPrefix);
  }

  public async requestEnvelope<TData>(
    req: ExecuteEnvelopeRequest<TData>
  ): Promise<ApiSuccessEnvelope<TData>> {
    const raw = await this.executeRequest({
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      authRequired: req.authRequired,
      idempotencyKey: req.idempotencyKey,
      allowIdempotentRetry: req.allowIdempotentRetry,
      signal: req.signal,
      correlationId: req.correlationId,
    });

    if (!this.config.validateResponses) {
      return raw as ApiSuccessEnvelope<TData>;
    }

    const envelopeSchema = createSuccessEnvelopeSchema(req.schema);
    const parsed = envelopeSchema.safeParse(raw);
    if (!parsed.success) {
      throw new DIPUnexpectedResponseError('API response did not match expected contract schema.', {
        details: parsed.error.issues.map((i) => ({
          field: i.path.join('.') || undefined,
          reason: i.message,
        })),
      });
    }
    return parsed.data as ApiSuccessEnvelope<TData>;
  }

  public async requestRaw<TData>(req: ExecuteRawRequest<TData>): Promise<TData> {
    const raw = await this.executeRequest({
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      authRequired: req.authRequired,
      idempotencyKey: req.idempotencyKey,
      allowIdempotentRetry: req.allowIdempotentRetry,
      signal: req.signal,
      correlationId: req.correlationId,
    });

    if (req.schema && this.config.validateResponses) {
      const parsed = req.schema.safeParse(raw);
      if (!parsed.success) {
        throw new DIPUnexpectedResponseError('API response did not match expected schema.', {
          details: parsed.error.issues.map((i) => ({
            field: i.path.join('.') || undefined,
            reason: i.message,
          })),
        });
      }
      return parsed.data;
    }

    return raw as TData;
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.config.apiBaseUrl}${cleanPath}`);

    if (!isTrustedOriginForToken(url.toString(), this.config.trustedOrigin)) {
      throw new DIPValidationError('Request URL escaped configured trusted API origin.');
    }

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async executeRequest(params: {
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    path: string;
    query?: Record<string, unknown>;
    body?: unknown;
    authRequired: boolean;
    idempotencyKey?: string;
    allowIdempotentRetry?: boolean;
    signal?: AbortSignal;
    correlationId?: string;
  }): Promise<unknown> {
    if (params.idempotencyKey && !IDEMPOTENCY_KEY_REGEX.test(params.idempotencyKey)) {
      throw new DIPValidationError('Invalid Idempotency-Key format.', {
        details: [
          {
            field: 'Idempotency-Key',
            reason: 'Must be 8-128 characters matching ^[a-zA-Z0-9_-]{8,128}$.',
          },
        ],
      });
    }

    const correlationId =
      params.correlationId && CORRELATION_ID_REGEX.test(params.correlationId)
        ? params.correlationId
        : createRandomId('req');

    const targetUrl = this.buildUrl(params.path, params.query);
    const serializedBody =
      params.body !== undefined && params.method !== 'GET' ? JSON.stringify(params.body) : undefined;

    let attempt = 0;
    let refreshedAfter401 = false;

    while (true) {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...this.config.headers,
        'X-Correlation-ID': correlationId,
        'X-DIP-SDK': '@digital-india/sdk/0.2.0',
      };

      if (serializedBody !== undefined) {
        headers['Content-Type'] = 'application/json';
      }
      if (params.idempotencyKey) {
        headers['Idempotency-Key'] = params.idempotencyKey;
      }
      if (this.config.userAgent && !isBrowserRuntime()) {
        headers['User-Agent'] = this.config.userAgent;
      }

      const token = refreshedAfter401
        ? await attemptTokenRefresh(this.tokenProvider)
        : await resolveAccessToken(this.tokenProvider);

      if (token && isTrustedOriginForToken(targetUrl, this.config.trustedOrigin)) {
        headers.Authorization = `Bearer ${token}`;
      } else if (params.authRequired) {
        throw new DIPAuthenticationError(
          'Access token is required for this endpoint. Supply a tokenProvider in DIPClientConfig.',
          { correlationId }
        );
      }

      const reqContext: DIPRequestContext = {
        method: params.method,
        url: redactUrl(targetUrl),
        headers: redactHeaders(headers),
        body: undefined, // Never expose raw bodies to middleware logs by default
        correlationId,
        attempt,
      };

      for (const mw of this.middleware) {
        await mw.onRequest?.(reqContext);
      }

      this.logger?.debug?.('dip-sdk request', {
        method: params.method,
        url: reqContext.url,
        correlationId,
        attempt,
        headers: reqContext.headers,
      });

      const startedAt = Date.now();
      try {
        const response = await this.transport.send({
          method: params.method,
          url: targetUrl,
          headers,
          body: serializedBody,
          timeoutMs: this.config.timeoutMs,
          signal: params.signal,
        });

        const durationMs = Date.now() - startedAt;
        const rateLimit = extractRateLimitInfo(response.headers);
        if (
          rateLimit.limit !== undefined ||
          rateLimit.remaining !== undefined ||
          rateLimit.retryAfterSeconds !== undefined
        ) {
          this.lastRateLimit = rateLimit;
        }

        const respCorrelationId = response.headers['x-correlation-id'] || correlationId;

        const respContext: DIPResponseContext = {
          method: params.method,
          url: reqContext.url,
          status: response.status,
          headers: redactHeaders(response.headers),
          correlationId: respCorrelationId,
          durationMs,
        };

        for (const mw of this.middleware) {
          await mw.onResponse?.(respContext);
        }

        // Redirects are blocked from auto-following so tokens cannot leak
        if (response.status >= 300 && response.status < 400) {
          throw new DIPUnexpectedResponseError(
            `Unexpected redirect status ${response.status} from API gateway.`,
            { status: response.status, correlationId: respCorrelationId }
          );
        }

        let parsedBody: unknown = undefined;
        if (response.text.trim().length > 0) {
          try {
            parsedBody = JSON.parse(response.text);
          } catch {
            if (response.status >= 200 && response.status < 300) {
              throw new DIPUnexpectedResponseError('API returned non-JSON success response.', {
                status: response.status,
                correlationId: respCorrelationId,
              });
            }
          }
        }

        if (response.status >= 200 && response.status < 300) {
          return parsedBody;
        }

        // Handle 401 token refresh once if caller provided a RefreshableTokenProvider
        if (
          response.status === 401 &&
          !refreshedAfter401 &&
          this.tokenProvider &&
          typeof this.tokenProvider !== 'function' &&
          typeof this.tokenProvider.refreshToken === 'function'
        ) {
          refreshedAfter401 = true;
          continue;
        }

        const errEnvelope = ApiErrorEnvelopeSchema.safeParse(parsedBody);
        if (errEnvelope.success) {
          throw mapHttpErrorToDIPAPIError({
            status: response.status,
            code: errEnvelope.data.error.code,
            message: errEnvelope.data.error.message,
            correlationId: errEnvelope.data.error.correlation_id || respCorrelationId,
            details: errEnvelope.data.error.details,
            retryAfterSeconds: rateLimit.retryAfterSeconds,
          });
        }

        throw mapHttpErrorToDIPAPIError({
          status: response.status,
          message: `API request failed with HTTP status ${response.status}`,
          correlationId: respCorrelationId,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        });
      } catch (error) {
        for (const mw of this.middleware) {
          await mw.onError?.(error, reqContext);
        }

        const retryEligible = isRequestEligibleForRetry({
          method: params.method,
          attempt,
          config: this.retryConfig,
          error,
          hasIdempotencyKey: Boolean(params.idempotencyKey),
          allowIdempotentRetry: params.allowIdempotentRetry,
          signal: params.signal,
        });

        if (retryEligible) {
          const retryAfterMs =
            error instanceof Error && 'retryAfterSeconds' in error
              ? typeof (error as { retryAfterSeconds?: number }).retryAfterSeconds === 'number'
                ? (error as { retryAfterSeconds: number }).retryAfterSeconds * 1000
                : undefined
              : undefined;
          const delayMs = computeBackoffDelayMs(attempt, this.retryConfig, retryAfterMs);
          this.logger?.warn?.('dip-sdk retrying transient failure', {
            method: params.method,
            url: reqContext.url,
            correlationId,
            attempt: attempt + 1,
            delayMs,
          });
          await sleepWithAbort(delayMs, params.signal);
          attempt += 1;
          continue;
        }

        this.logger?.error?.('dip-sdk request failed', {
          method: params.method,
          url: reqContext.url,
          correlationId,
          attempt,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });

        throw error;
      }
    }
  }
}
