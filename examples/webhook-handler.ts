/**
 * Functional Example (Server-Only Webhook Verification Handler)
 *
 * Uses `@digital-india/sdk/webhooks` (`src/server-sdk.ts`).
 * Keep webhook signing secrets strictly on the server via environment variables.
 */
import {
  InMemoryEventDeduplicationStore,
  verifyAndParseWebhookEvent,
  verifyCashfreeWebhookSignature,
} from '../src/server-sdk.js';

const dedupStore = new InMemoryEventDeduplicationStore();

export async function handleDipWebhookRequest(params: {
  signatureHeader: string | undefined;
  rawBody: string;
  webhookSecret: string;
}) {
  const event = verifyAndParseWebhookEvent({
    signatureHeader: params.signatureHeader,
    rawBody: params.rawBody,
    secret: params.webhookSecret,
    maxAgeSeconds: 300,
  });

  return dedupStore.processIdempotently(event.event_id, async () => {
    switch (event.event_type) {
      case 'application.submitted':
      case 'application.status_changed':
      case 'payment.paid':
      case 'payment.failed':
      case 'document.verified':
        return { acknowledged: true, eventId: event.event_id, type: event.event_type };
      default:
        return { acknowledged: true, eventId: event.event_id, type: 'unknown' };
    }
  });
}

export function handleCashfreeWebhookVerification(params: {
  timestampHeader: string | undefined;
  signatureHeader: string | undefined;
  rawBody: string;
  cashfreeSecret: string;
}) {
  return verifyCashfreeWebhookSignature({
    timestampHeader: params.timestampHeader,
    signatureHeader: params.signatureHeader,
    rawBody: params.rawBody,
    secret: params.cashfreeSecret,
  });
}
