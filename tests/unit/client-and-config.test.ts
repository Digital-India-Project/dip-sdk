import { describe, expect, it, vi } from 'vitest';
import {
  DIPAuthenticationError,
  DIPAuthorizationError,
  DIPClient,
  DIPConfigurationError,
  DIPConflictError,
  DIPNotFoundError,
  DIPRateLimitError,
  DIPServerError,
  DIPValidationError,
  REDACTED_VALUE,
  createCachingTokenProvider,
  createStaticTokenProvider,
  redactHeaders,
  redactSensitiveValue,
  redactUrl,
  type TransportAdapter,
  type TransportRequest,
} from '../../src/index.js';

describe('DIPClient configuration & security defaults', () => {
  it('enforces HTTPS in production and rejects embedded credentials', () => {
    expect(() => new DIPClient({ baseUrl: 'http://api.example.com' })).toThrow(
      DIPConfigurationError
    );
    expect(() => new DIPClient({ baseUrl: 'https://user:pass@api.example.com' })).toThrow(
      DIPConfigurationError
    );
    expect(
      () =>
        new DIPClient({
          baseUrl: 'http://localhost:4000',
          environment: 'production',
          allowInsecureHttpInDev: true,
        })
    ).toThrow(DIPConfigurationError);

    const sandboxClient = new DIPClient({
      baseUrl: 'http://127.0.0.1:4000',
      environment: 'sandbox',
      allowInsecureHttpInDev: true,
    });
    expect(sandboxClient.getOrigin()).toBe('http://127.0.0.1:4000');
  });

  it('redacts sensitive headers, query parameters, and payload fields', () => {
    const headers = redactHeaders({
      Authorization: 'Bearer secret_jwt_token',
      'X-Webhook-Signature': 't=1,v1=abc',
      'X-Correlation-ID': 'req_1234',
    });
    expect(headers.Authorization).toBe(REDACTED_VALUE);
    expect(headers['X-Webhook-Signature']).toBe(REDACTED_VALUE);
    expect(headers['X-Correlation-ID']).toBe('req_1234');

    const safeUrl = redactUrl(
      'https://storage.example.com/upload/doc_1?expires=1700&sig=topsecret&token=abc'
    );
    expect(safeUrl).not.toContain('topsecret');
    expect(safeUrl).not.toContain('abc');
    expect(safeUrl).toContain('expires=%5BREDACTED%5D');

    const redactedBody = redactSensitiveValue({
      aadhaar_number: '123456789012',
      nested: { upload_url: 'https://signed.example.com?sig=1', status: 'ok' },
    }) as Record<string, any>;
    expect(redactedBody.aadhaar_number).toBe(REDACTED_VALUE);
    expect(redactedBody.nested.upload_url).toBe(REDACTED_VALUE);
    expect(redactedBody.nested.status).toBe('ok');
  });

  it('logs only redacted metadata via middleware and logger', async () => {
    const loggedMeta: Array<Record<string, unknown> | undefined> = [];
    const seenMiddlewareHeaders: Array<Record<string, string>> = [];

    const transport: TransportAdapter = {
      send: async (req: TransportRequest) => {
        expect(req.headers.Authorization).toBe('Bearer super_secret_token');
        return {
          status: 200,
          headers: { 'content-type': 'application/json', 'x-correlation-id': req.headers['X-Correlation-ID'] },
          text: JSON.stringify({
            data: { status: 'ok', service: 'dip-api', version: 'v1', adapter_mode: 'sandbox' },
            meta: {
              api_version: 'v1',
              correlation_id: req.headers['X-Correlation-ID'],
              adapter_mode: 'sandbox',
              timestamp_utc: '2026-11-27T00:00:00Z',
            },
          }),
        };
      },
    };

    const client = new DIPClient({
      baseUrl: 'https://api.example.com',
      tokenProvider: createStaticTokenProvider('super_secret_token'),
      transport,
      middleware: [
        {
          onRequest: (ctx) => {
            seenMiddlewareHeaders.push(ctx.headers);
          },
        },
      ],
      logger: {
        debug: (_msg, meta) => loggedMeta.push(meta),
      },
    });

    await client.health.getHealth();
    expect(seenMiddlewareHeaders[0].Authorization).toBe(REDACTED_VALUE);
    expect(JSON.stringify(loggedMeta)).not.toContain('super_secret_token');
  });

  it('maps HTTP error envelopes to specific typed DIPAPIError subclasses', async () => {
    const cases: Array<[number, string, unknown]> = [
      [400, 'VALIDATION_ERROR', DIPValidationError],
      [401, 'UNAUTHENTICATED', DIPAuthenticationError],
      [403, 'FORBIDDEN', DIPAuthorizationError],
      [404, 'NOT_FOUND', DIPNotFoundError],
      [409, 'IDEMPOTENCY_CONFLICT', DIPConflictError],
      [429, 'RATE_LIMITED', DIPRateLimitError],
      [500, 'INTERNAL_ERROR', DIPServerError],
    ];

    for (const [status, code, ExpectedClass] of cases) {
      const transport: TransportAdapter = {
        send: async () => ({
          status,
          headers: status === 429 ? { 'retry-after': '12' } : {},
          text: JSON.stringify({
            error: {
              code,
              message: `Error ${code}`,
              correlation_id: 'req_test_err',
              details: [{ field: 'test', reason: 'invalid' }],
            },
          }),
        }),
      };

      const client = new DIPClient({
        baseUrl: 'https://api.example.com',
        transport,
        retry: { maxRetries: 0 },
      });

      await expect(client.health.getHealth()).rejects.toBeInstanceOf(ExpectedClass as never);
    }
  });

  it('supports RefreshableTokenProvider in-memory caching and single 401 refresh', async () => {
    let fetchCount = 0;
    const provider = createCachingTokenProvider({
      fetchToken: async () => {
        fetchCount += 1;
        return { accessToken: `tok_v${fetchCount}`, expiresInSeconds: 600 };
      },
    });

    const sendSpy = vi.fn(async (req: TransportRequest) => {
      if (req.headers.Authorization === 'Bearer tok_v1') {
        return {
          status: 401,
          headers: {},
          text: JSON.stringify({
            error: { code: 'UNAUTHENTICATED', message: 'Expired', correlation_id: 'req_1', details: [] },
          }),
        };
      }
      return {
        status: 200,
        headers: {},
        text: JSON.stringify({
          data: [],
          meta: {
            api_version: 'v1',
            correlation_id: 'req_1',
            adapter_mode: 'sandbox',
            timestamp_utc: '2026-11-27T00:00:00Z',
            pagination: { page: 1, limit: 20, total: 0, has_more: false },
          },
        }),
      };
    });

    const client = new DIPClient({
      baseUrl: 'https://api.example.com',
      tokenProvider: provider,
      transport: { send: sendSpy },
      retry: { maxRetries: 0 },
    });

    const result = await client.applications.list();
    expect(result.items).toEqual([]);
    expect(fetchCount).toBe(2);
    expect(sendSpy).toHaveBeenCalledTimes(2);
  });
});
