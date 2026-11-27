import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DIPClient,
  OPENAPI_OPERATIONS,
  OPENAPI_SPEC_META,
  createStaticTokenProvider,
} from '../../src/index.js';

describe('OpenAPI contract alignment tests', () => {
  it('matches src/api-spec.json operation inventory deterministically', () => {
    const specPath = path.resolve(process.cwd(), 'src', 'api-spec.json');
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8')) as {
      paths: Record<string, Record<string, { operationId?: string }>>;
    };

    const specOperations: string[] = [];
    for (const [routePath, methods] of Object.entries(spec.paths)) {
      for (const [method, op] of Object.entries(methods)) {
        specOperations.push(`${method.toUpperCase()} ${routePath} (${op.operationId})`);
      }
    }

    expect(OPENAPI_SPEC_META.operationCount).toBe(specOperations.length);
    expect(OPENAPI_OPERATIONS.length).toBe(specOperations.length);
  });

  it('maps every SDK resource client method to its verified /api/v1 route', async () => {
    const recordedCalls: Array<{ method: string; path: string }> = [];
    const client = new DIPClient({
      baseUrl: 'https://api.example.com',
      environment: 'sandbox',
      validateResponses: false,
      tokenProvider: createStaticTokenProvider('tok_contract'),
      transport: {
        send: async (req) => {
          const pathname = new URL(req.url).pathname;
          recordedCalls.push({ method: req.method, path: pathname });
          return {
            status: 200,
            headers: {},
            text: JSON.stringify({
              data: {},
              meta: {
                api_version: 'v1',
                correlation_id: 'req_c',
                adapter_mode: 'sandbox',
                timestamp_utc: '2026-11-27T00:00:00Z',
              },
            }),
          };
        },
      },
    });

    await client.health.getHealth();
    await client.health.getMetrics();
    await client.health.getOpenApiSpec();
    await client.services.list();
    await client.services.get('svc_1');
    await client.products.list();
    await client.products.get('prd_1');
    await client.applications.list();
    await client.applications.create({ service_id: 'svc_1', business_name: 'Test Biz' });
    await client.applications.get('app_1');
    await client.applications.update('app_1', { business_name: 'Updated Biz' });
    await client.applications.submit('app_1');
    await client.workflow.transition('app_1', { target_status: 'under_review', reason: 'Reviewing' });
    await client.documents.listForApplication('app_1');
    await client.documents.createUploadIntent('app_1', {
      document_type: 'identity_proof',
      file_name: 'id.pdf',
      mime_type: 'application/pdf',
      size_bytes: 1024,
    });
    await client.payments.createOrder({
      application_id: 'app_1',
      amount: { amount_minor: 5000, currency: 'INR' },
      purpose: 'Filing fee',
    });
    await client.payments.getOrder('ord_1');
    await client.payments.requestRefund('ord_1', {
      amount: { amount_minor: 5000, currency: 'INR' },
      reason: 'Cancelled',
    });
    await client.webhooks.listSubscriptions();
    await client.webhooks.createSubscription({
      url: 'https://partner.example.com/webhooks',
      events: ['application.submitted'],
    });
    await client.webhooks.listDeliveries();
    await client.integrations.listProviders();
    await client.integrations.executeSandboxCheck('gst_sandbox_adapter');
    await client.sandbox.issueToken();

    const expectedRoutes = [
      'GET /api/v1/health',
      'GET /api/v1/metrics',
      'GET /api/v1/openapi.json',
      'GET /api/v1/services',
      'GET /api/v1/services/svc_1',
      'GET /api/v1/products',
      'GET /api/v1/products/prd_1',
      'GET /api/v1/applications',
      'POST /api/v1/applications',
      'GET /api/v1/applications/app_1',
      'PATCH /api/v1/applications/app_1',
      'POST /api/v1/applications/app_1/submit',
      'POST /api/v1/applications/app_1/transition',
      'GET /api/v1/applications/app_1/documents',
      'POST /api/v1/applications/app_1/documents/upload-intent',
      'POST /api/v1/payments/orders',
      'GET /api/v1/payments/orders/ord_1',
      'POST /api/v1/payments/orders/ord_1/refunds',
      'GET /api/v1/webhooks/subscriptions',
      'POST /api/v1/webhooks/subscriptions',
      'GET /api/v1/webhooks/deliveries',
      'GET /api/v1/integrations/providers',
      'POST /api/v1/integrations/providers/gst_sandbox_adapter/sandbox-check',
      'POST /api/v1/sandbox/token',
    ];

    expect(recordedCalls.map((c) => `${c.method} ${c.path}`)).toEqual(expectedRoutes);
  });
});
