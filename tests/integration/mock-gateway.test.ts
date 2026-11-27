import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  DIPAbortError,
  DIPClient,
  DIPConflictError,
  DIPRateLimitError,
  DIPTimeoutError,
  DIPUnexpectedResponseError,
  createStaticTokenProvider,
} from '../../src/index.js';

let server: http.Server;
let baseUrl: string;
const usedIdempotencyKeys = new Map<string, string>();

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      const correlationId = (req.headers['x-correlation-id'] as string) || 'req_mock';
      const url = new URL(req.url || '/', 'http://127.0.0.1');

      const sendJson = (status: number, payload: unknown, extraHeaders: Record<string, string> = {}) => {
        res.writeHead(status, {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '99',
          ...extraHeaders,
        });
        res.end(JSON.stringify(payload));
      };

      const envelope = (data: unknown, pagination?: unknown) => ({
        data,
        meta: {
          api_version: 'v1',
          correlation_id: correlationId,
          adapter_mode: 'sandbox',
          timestamp_utc: '2026-11-27T00:00:00Z',
          ...(pagination ? { pagination } : {}),
        },
      });

      if (req.method === 'GET' && url.pathname === '/api/v1/health') {
        return sendJson(200, envelope({ status: 'ok', service: 'dip-api', version: 'v1', adapter_mode: 'sandbox' }));
      }

      if (req.method === 'GET' && url.pathname === '/api/v1/services') {
        return sendJson(
          200,
          envelope(
            [
              {
                id: 'svc_msme_assist',
                slug: 'msme-registration-assistance',
                title: 'MSME Registration Assistance',
                category: 'business_registration',
                summary: 'Guided preparation',
                fee: { amount_minor: 149900, currency: 'INR' },
                available: true,
                required_documents: ['identity_proof'],
                updated_at: '2026-11-01T10:00:00Z',
              },
            ],
            { page: 1, limit: 20, total: 1, has_more: false }
          )
        );
      }

      if (req.method === 'POST' && url.pathname === '/api/v1/applications') {
        if (req.headers.authorization !== 'Bearer tok_valid') {
          return sendJson(401, {
            error: { code: 'UNAUTHENTICATED', message: 'Missing or invalid token', correlation_id: correlationId, details: [] },
          });
        }
        const idemKey = req.headers['idempotency-key'] as string | undefined;
        if (!idemKey) {
          return sendJson(400, {
            error: { code: 'VALIDATION_ERROR', message: 'Idempotency-Key required', correlation_id: correlationId, details: [] },
          });
        }
        const prev = usedIdempotencyKeys.get(idemKey);
        if (prev && prev !== rawBody) {
          return sendJson(409, {
            error: { code: 'IDEMPOTENCY_CONFLICT', message: 'Payload mismatch', correlation_id: correlationId, details: [] },
          });
        }
        usedIdempotencyKeys.set(idemKey, rawBody);
        const parsed = JSON.parse(rawBody);
        return sendJson(
          201,
          envelope({
            id: 'app_001',
            tenant_id: 'tenant_1',
            owner_user_id: 'usr_1',
            service_id: parsed.service_id,
            business_name: parsed.business_name,
            status: parsed.submit_immediately ? 'submitted' : 'draft',
            form_data: parsed.form_data || {},
            workflow_history: [],
            created_at: '2026-11-27T00:00:00Z',
            updated_at: '2026-11-27T00:00:00Z',
          })
        );
      }

      if (req.method === 'GET' && url.pathname === '/api/v1/products') {
        return sendJson(
          429,
          { error: { code: 'RATE_LIMITED', message: 'Slow down', correlation_id: correlationId, details: [] } },
          { 'Retry-After': '2' }
        );
      }

      if (req.method === 'GET' && url.pathname === '/api/v1/metrics') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('not-json');
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/v1/services/slow_svc') {
        setTimeout(() => {
          sendJson(200, envelope({ id: 'slow_svc' }));
        }, 250);
        return;
      }

      sendJson(404, {
        error: { code: 'NOT_FOUND', message: 'Not found', correlation_id: correlationId, details: [] },
      });
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe('Integration tests against isolated mock dip-api HTTP server', () => {
  it('executes health, catalogue listing, and idempotent application creation over real FetchTransport', async () => {
    const client = new DIPClient({
      baseUrl,
      environment: 'sandbox',
      allowInsecureHttpInDev: true,
      tokenProvider: createStaticTokenProvider('tok_valid'),
    });

    const health = await client.health.getHealth();
    expect(health.status).toBe('ok');

    const services = await client.services.list();
    expect(services.items).toHaveLength(1);
    expect(client.getLastRateLimit()?.limit).toBe(100);

    const created = await client.applications.create(
      { service_id: 'svc_msme_assist', business_name: 'Bharat Traders LLP' },
      { idempotencyKey: 'idem_app_create_001' }
    );
    expect(created.id).toBe('app_001');

    await expect(
      client.applications.create(
        { service_id: 'svc_msme_assist', business_name: 'Different Name' },
        { idempotencyKey: 'idem_app_create_001' }
      )
    ).rejects.toBeInstanceOf(DIPConflictError);
  });

  it('surfaces rate limits, malformed non-JSON responses, timeouts, and AbortSignal cancellation', async () => {
    const client = new DIPClient({
      baseUrl,
      environment: 'sandbox',
      allowInsecureHttpInDev: true,
      timeoutMs: 80,
      retry: { maxRetries: 0 },
    });

    await expect(client.products.list()).rejects.toBeInstanceOf(DIPRateLimitError);
    await expect(client.health.getMetrics()).rejects.toBeInstanceOf(DIPUnexpectedResponseError);
    await expect(client.services.get('slow_svc')).rejects.toBeInstanceOf(DIPTimeoutError);

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 15);
    await expect(client.services.get('slow_svc', { signal: controller.signal })).rejects.toBeInstanceOf(
      DIPAbortError
    );
  });
});
