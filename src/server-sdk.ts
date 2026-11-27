/**
 * Server-only exports for `@digital-india/sdk/webhooks`.
 *
 * Uses Node.js `node:crypto` for constant-time HMAC signature verification.
 * Do NOT import this entrypoint in browser bundles or expose webhook secrets client-side.
 */
export {
  InMemoryEventDeduplicationStore,
  signTestWebhookPayload,
  verifyAndParseWebhookEvent,
  verifyCashfreeWebhookSignature,
  verifyWebhookSignature,
  type WebhookVerificationFailure,
  type WebhookVerificationResult,
  type WebhookVerificationSuccess,
} from './webhooks/verify.js';
