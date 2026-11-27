# Webhooks & Event Verification Guide

## 1. Server-Only Entrypoint

Webhook signature verification uses Node.js `node:crypto` and requires webhook signing secrets. Always import webhook verification utilities exclusively from `@digital-india/sdk/webhooks` in **server-side code only**:

```ts
import {
  verifyAndParseWebhookEvent,
  verifyCashfreeWebhookSignature,
  InMemoryEventDeduplicationStore,
} from '@digital-india/sdk/webhooks';
```

Never import `@digital-india/sdk/webhooks` in browser bundles or expose signing secrets in client applications.

## 2. Verified `dip-api` Webhook Contract

`dip-api` signs webhook deliveries using:
- Header: `X-Webhook-Signature: t=<unix_seconds>,v1=<hmac_sha256_hex>,kid=<key_id>`
- Canonical string: `${timestampSeconds}.${rawBody}`
- Default replay window: `300` seconds (5 minutes)
- Verified event types:
  - `application.submitted`
  - `application.status_changed`
  - `payment.paid`
  - `payment.failed`
  - `document.verified`

### Example Express/Node Handler
```ts
const dedup = new InMemoryEventDeduplicationStore();

const event = verifyAndParseWebhookEvent({
  signatureHeader: req.header('x-webhook-signature'),
  rawBody, // exact raw UTF-8 request body string or Buffer
  secret: process.env.DIP_WEBHOOK_SECRET!,
  maxAgeSeconds: 300,
});

await dedup.processIdempotently(event.event_id, async () => {
  // Handle event idempotently
});
```

## 3. Cashfree Payment Webhook Verification

Matching `dip-api`'s `CashfreeAdapter.ts` contract (`${timestampHeader}${rawBody}` base64 HMAC-SHA256):
```ts
const check = verifyCashfreeWebhookSignature({
  timestampHeader: req.header('x-webhook-timestamp'),
  signatureHeader: req.header('x-webhook-signature'),
  rawBody,
  secret: process.env.CASHFREE_WEBHOOK_SECRET!,
});
if (!check.valid) {
  throw new Error(check.reason);
}
```
