import { describe, expect, it } from 'vitest';
import {
  DIPClient,
  DIPConfigurationError,
  DIPUnexpectedResponseError,
  DIPValidationError,
  REDACTED_VALUE,
  createStaticTokenProvider,
  isTrustedOriginForToken,
  type TransportAdapter,
} from '../../src/index.js';
import { verifyCashfreeWebhookSignature, verifyWebhookSignature } from '../../src/server-sdk.js';

describe('Security safeguards', () => {
  it('blocks redirect responses (3xx) so Bearer tokens never forward cross-origin', async () => {
    const transport: TransportAdapter = {
      send: async () => ({
        status: 302,
        headers: { location: 'https://untrusted.example.com/steal' },
        text: '',
      }),
    };

    const client = new DIPClient({
      baseUrl: 'https://api.example.com',
      tokenProvider: createStaticTokenProvider('tok_sensitive_123'),
      transport,
      retry: { maxRetries: 0 },
    });

    await expect(client.applications.list()).rejects.toBeInstanceOf(DIPUnexpectedResponseError);
  });

  it('rejects path traversal and unsafe identifiers on resource calls', async () => {
    const client = new DIPClient({
      baseUrl: 'https://api.example.com',
      tokenProvider: createStaticTokenProvider('tok_test'),
    });

    await expect(client.services.get('../admin')).rejects.toBeInstanceOf(DIPValidationError);
    await expect(client.applications.get('app/../../secret')).rejects.toBeInstanceOf(DIPValidationError);
    await expect(client.payments.getOrder('..')).rejects.toBeInstanceOf(DIPValidationError);
    await expect(
      client.documents.createUploadIntent('app_1', {
        document_type: 'identity_proof',
        file_name: '../../etc/passwd',
        mime_type: 'application/pdf',
        size_bytes: 100,
      })
    ).rejects.toBeInstanceOf(DIPValidationError);
  });

  it('rejects non-HTTPS webhook subscriptions, non-HTTPS signed URLs, and sandbox minting in production', async () => {
    const client = new DIPClient({
      baseUrl: 'https://api.example.com',
      environment: 'production',
      tokenProvider: createStaticTokenProvider('tok_prod'),
    });

    await expect(
      client.webhooks.createSubscription({
        url: 'http://insecure.example.com/hook',
        events: ['application.submitted'],
      })
    ).rejects.toBeInstanceOf(DIPValidationError);

    await expect(
      client.documents.uploadToSignedUrl({
        uploadUrl: 'http://insecure-bucket.example.com/upload/doc_1',
        data: new Uint8Array([1, 2, 3]),
        contentType: 'application/pdf',
      })
    ).rejects.toBeInstanceOf(DIPValidationError);

    await expect(client.sandbox.issueToken()).rejects.toBeInstanceOf(DIPConfigurationError);
  });

  it('validates origin boundaries and redacts secrets in error/logger pipelines', async () => {
    expect(isTrustedOriginForToken('https://api.example.com/api/v1/health', 'https://api.example.com')).toBe(true);
    expect(isTrustedOriginForToken('https://evil.example.com/api/v1/health', 'https://api.example.com')).toBe(false);

    const capturedLogs: unknown[] = [];
    const client = new DIPClient({
      baseUrl: 'https://api.example.com',
      tokenProvider: createStaticTokenProvider('super_secret_bearer_value'),
      retry: { maxRetries: 0 },
      logger: {
        debug: (_msg, meta) => capturedLogs.push(meta),
        error: (_msg, meta) => capturedLogs.push(meta),
      },
      transport: {
        send: async () => ({
          status: 500,
          headers: {},
          text: JSON.stringify({
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Server failure',
              correlation_id: 'req_sec',
              details: [],
            },
          }),
        }),
      },
    });

    await expect(client.applications.list()).rejects.toThrow('Server failure');
    const serialized = JSON.stringify(capturedLogs);
    expect(serialized).not.toContain('super_secret_bearer_value');
    expect(serialized).toContain(REDACTED_VALUE);
  });

  it('rejects empty secrets and mismatched-length HMAC signatures safely', () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: 't=1700000000,v1=deadbeef',
        rawBody: '{}',
        secret: '',
      }).valid
    ).toBe(false);

    expect(
      verifyCashfreeWebhookSignature({
        timestampHeader: String(Date.now()),
        signatureHeader: 'short',
        rawBody: '{}',
        secret: 'cf_secret',
      }).valid
    ).toBe(false);
  });
});
