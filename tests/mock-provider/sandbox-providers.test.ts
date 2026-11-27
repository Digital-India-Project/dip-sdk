import { describe, expect, it } from 'vitest';
import {
  ApiClient,
  ApiSathiClient,
  DIPClient,
  createStaticTokenProvider,
  type TransportAdapter,
} from '../../src/index.js';

describe('Isolated mock provider tests (non-live sandbox fixtures)', () => {
  it('lists synthetic providers and runs sandbox-check against mocked dip-api provider registry', async () => {
    const transport: TransportAdapter = {
      send: async (req) => {
        const pathname = new URL(req.url).pathname;
        if (req.method === 'GET' && pathname === '/api/v1/integrations/providers') {
          return {
            status: 200,
            headers: {},
            text: JSON.stringify({
              data: [
                {
                  id: 'gst_sandbox_adapter',
                  name: 'GST Verification Adapter',
                  category: 'gst_verification',
                  adapter_mode: 'sandbox',
                  contract_approved: false,
                  timeout_ms: 5000,
                  max_retries: 2,
                  circuit_state: 'closed',
                  notes: 'Synthetic sandbox adapter only.',
                },
                {
                  id: 'digilocker_planned',
                  name: 'DigiLocker / Entity Locker Adapter',
                  category: 'digilocker',
                  adapter_mode: 'planned_unconnected',
                  contract_approved: false,
                  timeout_ms: 8000,
                  max_retries: 1,
                  circuit_state: 'closed',
                  notes: 'Interface boundary reserved.',
                },
              ],
              meta: {
                api_version: 'v1',
                correlation_id: 'req_mock_prov',
                adapter_mode: 'sandbox',
                timestamp_utc: '2026-11-27T00:00:00Z',
              },
            }),
          };
        }

        if (
          req.method === 'POST' &&
          pathname === '/api/v1/integrations/providers/gst_sandbox_adapter/sandbox-check'
        ) {
          return {
            status: 200,
            headers: {},
            text: JSON.stringify({
              data: {
                provider_id: 'gst_sandbox_adapter',
                adapter_mode: 'sandbox',
                verified: true,
                reference_id: 'sbx_gst_verification_001',
                checked_at_utc: '2026-11-27T00:00:00Z',
              },
              meta: {
                api_version: 'v1',
                correlation_id: 'req_mock_prov_chk',
                adapter_mode: 'sandbox',
                timestamp_utc: '2026-11-27T00:00:00Z',
              },
            }),
          };
        }

        return { status: 404, headers: {}, text: '{}' };
      },
    };

    const client = new DIPClient({
      baseUrl: 'https://sandbox.api.example.com',
      environment: 'sandbox',
      tokenProvider: createStaticTokenProvider('tok_mock_provider'),
      transport,
    });

    const providers = await client.integrations.listProviders();
    expect(providers).toHaveLength(2);
    expect(providers[1].adapter_mode).toBe('planned_unconnected');

    const check = await client.integrations.executeSandboxCheck('gst_sandbox_adapter');
    expect(check.adapter_mode).toBe('sandbox');
    expect(check.verified).toBe(true);
  });

  it('exercises mocked Cashfree sandbox payment lifecycle (create, get, refund)', async () => {
    const orders = new Map<string, any>();

    const transport: TransportAdapter = {
      send: async (req) => {
        const pathname = new URL(req.url).pathname;
        if (req.method === 'POST' && pathname === '/api/v1/payments/orders') {
          const body = JSON.parse(String(req.body));
          const record = {
            id: 'ord_sbx_001',
            tenant_id: 'tenant_sbx',
            owner_user_id: 'usr_sbx',
            application_id: body.application_id,
            provider: 'cashfree_sandbox',
            provider_order_ref: 'cf_sbx_ord_sbx_001',
            amount: body.amount,
            purpose: body.purpose,
            status: 'created',
            created_at: '2026-11-27T00:00:00Z',
            updated_at: '2026-11-27T00:00:00Z',
          };
          orders.set(record.id, record);
          return {
            status: 201,
            headers: {},
            text: JSON.stringify({
              data: record,
              meta: {
                api_version: 'v1',
                correlation_id: 'req_pay_1',
                adapter_mode: 'sandbox',
                timestamp_utc: '2026-11-27T00:00:00Z',
              },
            }),
          };
        }

        if (req.method === 'GET' && pathname === '/api/v1/payments/orders/ord_sbx_001') {
          const current = { ...orders.get('ord_sbx_001'), status: 'paid' };
          orders.set('ord_sbx_001', current);
          return {
            status: 200,
            headers: {},
            text: JSON.stringify({
              data: current,
              meta: {
                api_version: 'v1',
                correlation_id: 'req_pay_2',
                adapter_mode: 'sandbox',
                timestamp_utc: '2026-11-27T00:00:00Z',
              },
            }),
          };
        }

        if (req.method === 'POST' && pathname === '/api/v1/payments/orders/ord_sbx_001/refunds') {
          const updated = { ...orders.get('ord_sbx_001'), status: 'refund_requested' };
          return {
            status: 200,
            headers: {},
            text: JSON.stringify({
              data: updated,
              meta: {
                api_version: 'v1',
                correlation_id: 'req_pay_3',
                adapter_mode: 'sandbox',
                timestamp_utc: '2026-11-27T00:00:00Z',
              },
            }),
          };
        }

        return { status: 404, headers: {}, text: '{}' };
      },
    };

    const client = new DIPClient({
      baseUrl: 'https://sandbox.api.example.com',
      environment: 'sandbox',
      tokenProvider: createStaticTokenProvider('tok_mock_pay'),
      transport,
    });

    const created = await client.payments.createOrder({
      application_id: 'app_001',
      amount: { amount_minor: 149900, currency: 'INR' },
      purpose: 'Sandbox test fee',
    });
    expect(created.provider).toBe('cashfree_sandbox');
    expect(created.status).toBe('created');

    const fetched = await client.payments.getOrder(created.id);
    expect(fetched.status).toBe('paid');

    const refunded = await client.payments.requestRefund(created.id, {
      amount: { amount_minor: 149900, currency: 'INR' },
      reason: 'Sandbox cancellation test',
    });
    expect(refunded.status).toBe('refund_requested');
  });

  it('supports mocked DIPINDIA worker gateway status via legacy ApiSathiClient', async () => {
    const legacyClient = new ApiClient({
      baseUrl: 'https://dipindia.example.com',
      getToken: () => 'tok_legacy',
    });
    // Stub axios instance request cleanly for isolated mock test
    (legacyClient as unknown as { http: { request: () => Promise<{ data: unknown }> } }).http.request =
      async () => ({
        data: {
          success: true,
          status: 'SUCCESS',
          message: 'API Sathi status loaded',
          request_id: 'req_sathi_1',
          data: {
            configured: true,
            isSandboxTestKey: true,
            keyMode: 'sandbox_test',
          },
        },
      });

    const apiSathi = new ApiSathiClient(legacyClient);
    const status = await apiSathi.getGatewayStatus();
    expect(status.success).toBe(true);
    expect(status.data.isSandboxTestKey).toBe(true);
  });
});
