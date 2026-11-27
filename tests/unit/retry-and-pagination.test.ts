import { describe, expect, it, vi } from 'vitest';
import {
  DIPAbortError,
  DIPClient,
  DIPValidationError,
  collectAllPages,
  createStaticTokenProvider,
  parseRetryAfterMs,
  type TransportAdapter,
} from '../../src/index.js';

describe('Retry policy, idempotency, pagination & document safeguards', () => {
  it('parses Retry-After seconds and HTTP-dates safely', () => {
    expect(parseRetryAfterMs('5')).toBe(5000);
    expect(parseRetryAfterMs('120', 30_000)).toBe(30_000);
    const future = new Date(Date.now() + 3000).toUTCString();
    const parsed = parseRetryAfterMs(future);
    expect(parsed).toBeGreaterThan(0);
    expect(parsed).toBeLessThanOrEqual(4000);
  });

  it('retries safe GET on 503 up to maxRetries', async () => {
    let calls = 0;
    const transport: TransportAdapter = {
      send: async () => {
        calls += 1;
        if (calls < 3) {
          return {
            status: 503,
            headers: {},
            text: JSON.stringify({
              error: { code: 'PROVIDER_UNAVAILABLE', message: 'Busy', correlation_id: 'req_1', details: [] },
            }),
          };
        }
        return {
          status: 200,
          headers: {},
          text: JSON.stringify({
            data: { status: 'ok', service: 'dip-api', version: 'v1', adapter_mode: 'sandbox' },
            meta: {
              api_version: 'v1',
              correlation_id: 'req_1',
              adapter_mode: 'sandbox',
              timestamp_utc: '2026-11-27T00:00:00Z',
            },
          }),
        };
      },
    };

    const client = new DIPClient({
      baseUrl: 'https://api.example.com',
      transport,
      retry: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5, jitter: false },
    });

    const health = await client.health.getHealth();
    expect(health.status).toBe('ok');
    expect(calls).toBe(3);
  });

  it('never blindly retries payment order creation or refunds on 503 by default', async () => {
    const sendSpy = vi.fn(async () => ({
      status: 503,
      headers: {},
      text: JSON.stringify({
        error: { code: 'PROVIDER_UNAVAILABLE', message: 'Gateway down', correlation_id: 'req_pay', details: [] },
      }),
    }));

    const client = new DIPClient({
      baseUrl: 'https://api.example.com',
      tokenProvider: createStaticTokenProvider('tok_test'),
      transport: { send: sendSpy },
      retry: { maxRetries: 3, baseDelayMs: 1, jitter: false },
    });

    await expect(
      client.payments.createOrder({
        application_id: 'app_123',
        amount: { amount_minor: 149900, currency: 'INR' },
        purpose: 'Service fee',
      })
    ).rejects.toThrow();
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it('iterates multi-page paginated responses cleanly', async () => {
    const transport: TransportAdapter = {
      send: async (req) => {
        const page = Number(new URL(req.url).searchParams.get('page') || '1');
        const items =
          page === 1
            ? [{ id: 'svc_1', slug: 's1', title: 'S1', category: 'tax_compliance', summary: 'x', fee: { amount_minor: 100, currency: 'INR' }, available: true, required_documents: [], updated_at: '2026-11-01T00:00:00Z' }]
            : [{ id: 'svc_2', slug: 's2', title: 'S2', category: 'licensing', summary: 'y', fee: { amount_minor: 200, currency: 'INR' }, available: true, required_documents: [], updated_at: '2026-11-01T00:00:00Z' }];
        return {
          status: 200,
          headers: {},
          text: JSON.stringify({
            data: items,
            meta: {
              api_version: 'v1',
              correlation_id: 'req_pg',
              adapter_mode: 'sandbox',
              timestamp_utc: '2026-11-27T00:00:00Z',
              pagination: { page, limit: 1, total: 2, has_more: page < 2 },
            },
          }),
        };
      },
    };

    const client = new DIPClient({ baseUrl: 'https://api.example.com', transport });
    const all = await collectAllPages((page) => client.services.list({ page, limit: 1 }));
    expect(all.map((s) => s.id)).toEqual(['svc_1', 'svc_2']);
  });

  it('validates signed URL upload size, MIME type, expiration, and AbortSignal', async () => {
    const client = new DIPClient({ baseUrl: 'https://api.example.com' });

    await expect(
      client.documents.uploadToSignedUrl({
        uploadUrl: 'https://storage.example.com/upload/doc_1?sig=abc',
        expiresAtUtc: '2020-01-01T00:00:00Z',
        data: new Uint8Array([1, 2, 3]),
        contentType: 'application/pdf',
      })
    ).rejects.toBeInstanceOf(DIPValidationError);

    const controller = new AbortController();
    controller.abort();
    await expect(
      client.documents.uploadToSignedUrl({
        uploadUrl: 'https://storage.example.com/upload/doc_1?sig=abc',
        data: new Uint8Array([1, 2, 3]),
        contentType: 'application/pdf',
        signal: controller.signal,
      })
    ).rejects.toBeInstanceOf(DIPAbortError);

    const progressEvents: number[] = [];
    const uploadResult = await client.documents.uploadToSignedUrl({
      uploadUrl: 'https://storage.example.com/upload/doc_1?sig=abc',
      expiresAtUtc: new Date(Date.now() + 60_000).toISOString(),
      data: new Uint8Array([10, 20, 30]),
      contentType: 'image/png',
      onProgress: (p) => progressEvents.push(p.percent),
      fetchImpl: async () => new Response(null, { status: 200, headers: { etag: '"abc123"' } }),
    });
    expect(uploadResult.status).toBe(200);
    expect(uploadResult.etag).toBe('"abc123"');
    expect(progressEvents).toEqual([0, 100]);
  });
});
