import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  InMemoryEventDeduplicationStore,
  signTestWebhookPayload,
  verifyAndParseWebhookEvent,
  verifyCashfreeWebhookSignature,
  verifyWebhookSignature,
} from '../../src/server-sdk.js';

describe('Server-only webhook signature verification & replay protection', () => {
  it('verifies valid dip-api X-Webhook-Signature and rejects tampered/expired payloads', () => {
    const secret = 'whsec_test_secret_12345';
    const nowSec = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      event_id: 'evt_123',
      event_type: 'application.submitted',
      version: 'v1',
      occurred_at_utc: new Date(nowSec * 1000).toISOString(),
      data: { application_id: 'app_001' },
    });

    const sigHeader = signTestWebhookPayload({
      timestampSeconds: nowSec,
      rawBody: body,
      secret,
      keyId: 'k1',
    });

    const verified = verifyWebhookSignature({
      signatureHeader: sigHeader,
      rawBody: body,
      secret,
      nowSeconds: nowSec,
    });
    expect(verified).toEqual({ valid: true, timestampSeconds: nowSec, keyId: 'k1' });

    const event = verifyAndParseWebhookEvent({
      signatureHeader: sigHeader,
      rawBody: body,
      secret,
      nowSeconds: nowSec,
    });
    expect(event.event_id).toBe('evt_123');
    expect(event.event_type).toBe('application.submitted');

    const tampered = verifyWebhookSignature({
      signatureHeader: sigHeader,
      rawBody: body + ' ',
      secret,
      nowSeconds: nowSec,
    });
    expect(tampered.valid).toBe(false);

    const expired = verifyWebhookSignature({
      signatureHeader: sigHeader,
      rawBody: body,
      secret,
      nowSeconds: nowSec + 600,
      maxAgeSeconds: 300,
    });
    expect(expired.valid).toBe(false);
  });

  it('verifies Cashfree webhook HMAC-SHA256 base64 signatures', () => {
    const secret = 'cf_webhook_test_secret';
    const tsMs = String(Date.now());
    const rawBody = JSON.stringify({ event_id: 'evt_cf_1', type: 'PAYMENT_SUCCESS_WEBHOOK' });
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${tsMs}${rawBody}`)
      .digest('base64');

    expect(
      verifyCashfreeWebhookSignature({
        timestampHeader: tsMs,
        signatureHeader: signature,
        rawBody,
        secret,
        nowMs: Number(tsMs),
      })
    ).toEqual({ valid: true });

    expect(
      verifyCashfreeWebhookSignature({
        timestampHeader: tsMs,
        signatureHeader: 'wrong',
        rawBody,
        secret,
        nowMs: Number(tsMs),
      }).valid
    ).toBe(false);
  });

  it('deduplicates repeated webhook event IDs idempotently', async () => {
    const store = new InMemoryEventDeduplicationStore();
    let runs = 0;

    const first = await store.processIdempotently('evt_unique_1', async () => {
      runs += 1;
      return 'processed';
    });
    const second = await store.processIdempotently('evt_unique_1', async () => {
      runs += 1;
      return 'processed';
    });

    expect(first).toEqual({ deduplicated: false, result: 'processed' });
    expect(second).toEqual({ deduplicated: true });
    expect(runs).toBe(1);
  });
});
