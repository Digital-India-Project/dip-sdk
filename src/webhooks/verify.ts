import crypto from 'node:crypto';
import { WebhookEventEnvelopeSchema, type WebhookEventEnvelope } from '../contracts/domain.js';
import { DIPValidationError } from '../core/errors.js';

export interface WebhookVerificationSuccess {
  valid: true;
  timestampSeconds: number;
  keyId?: string;
}

export interface WebhookVerificationFailure {
  valid: false;
  reason: string;
}

export type WebhookVerificationResult = WebhookVerificationSuccess | WebhookVerificationFailure;

/**
 * Verifies the `X-Webhook-Signature` header emitted by `dip-api` WebhookService.
 * Contract: `t=<unix_seconds>,v1=<hmac_sha256_hex>,kid=<key_id>`
 * Signed string: `${timestampSeconds}.${canonicalBody}`
 *
 * SERVER-SIDE ONLY: Never import or execute with webhook secrets in browser bundles.
 */
export function verifyWebhookSignature(params: {
  signatureHeader: string | undefined;
  rawBody: string | Uint8Array;
  secret: string;
  maxAgeSeconds?: number;
  nowSeconds?: number;
}): WebhookVerificationResult {
  const { signatureHeader, rawBody, secret, maxAgeSeconds = 300, nowSeconds } = params;

  if (!secret || secret.trim().length === 0) {
    return { valid: false, reason: 'Webhook signing secret is required.' };
  }
  if (!signatureHeader || signatureHeader.trim().length === 0) {
    return { valid: false, reason: 'Missing X-Webhook-Signature header.' };
  }

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((segment) => {
      const idx = segment.indexOf('=');
      return idx > 0
        ? [segment.slice(0, idx).trim(), segment.slice(idx + 1).trim()]
        : [segment.trim(), ''];
    })
  );

  const timestampSeconds = Number(parts.t);
  const v1 = parts.v1;
  const keyId = parts.kid || undefined;

  if (!Number.isFinite(timestampSeconds) || !v1 || !/^[a-fA-F0-9]+$/.test(v1)) {
    return { valid: false, reason: 'Malformed X-Webhook-Signature header.' };
  }

  const currentSec = nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(currentSec - timestampSeconds) > maxAgeSeconds) {
    return { valid: false, reason: 'Webhook signature timestamp outside replay window.' };
  }

  const bodyString = typeof rawBody === 'string' ? rawBody : Buffer.from(rawBody).toString('utf8');
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${timestampSeconds}.${bodyString}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  const providedBuf = Buffer.from(v1.toLowerCase(), 'utf8');

  if (
    expectedBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return { valid: false, reason: 'Webhook signature mismatch.' };
  }

  return { valid: true, timestampSeconds, keyId };
}

/**
 * Verifies Cashfree webhook signature matching `dip-api` / `DIPINDIA` contract:
 * Signed string: `${timestampHeader}${rawBody}` encoded as base64 HMAC-SHA256.
 *
 * SERVER-SIDE ONLY.
 */
export function verifyCashfreeWebhookSignature(params: {
  timestampHeader: string | undefined;
  signatureHeader: string | undefined;
  rawBody: string | Uint8Array;
  secret: string;
  maxAgeMs?: number;
  nowMs?: number;
}): { valid: true } | { valid: false; reason: string } {
  const {
    timestampHeader,
    signatureHeader,
    rawBody,
    secret,
    maxAgeMs = 5 * 60 * 1000,
    nowMs = Date.now(),
  } = params;

  if (!secret || secret.trim().length === 0) {
    return { valid: false, reason: 'Cashfree webhook secret is required.' };
  }
  if (!timestampHeader || !signatureHeader) {
    return { valid: false, reason: 'Missing Cashfree webhook signature or timestamp header.' };
  }

  const tsMs = Number(timestampHeader);
  if (!Number.isFinite(tsMs) || Math.abs(nowMs - tsMs) > maxAgeMs) {
    return { valid: false, reason: 'Cashfree webhook timestamp outside allowed replay window.' };
  }

  const bodyString = typeof rawBody === 'string' ? rawBody : Buffer.from(rawBody).toString('utf8');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestampHeader}${bodyString}`)
    .digest('base64');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(signatureHeader, 'utf8');

  if (
    expectedBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return { valid: false, reason: 'Invalid Cashfree webhook HMAC signature.' };
  }

  return { valid: true };
}

/**
 * Verifies signature and parses a `dip-api` webhook event envelope safely.
 */
export function verifyAndParseWebhookEvent(params: {
  signatureHeader: string | undefined;
  rawBody: string | Uint8Array;
  secret: string;
  maxAgeSeconds?: number;
  nowSeconds?: number;
}): WebhookEventEnvelope {
  const verification = verifyWebhookSignature(params);
  if (!verification.valid) {
    throw new DIPValidationError(verification.reason, {
      details: [{ field: 'X-Webhook-Signature', reason: verification.reason }],
    });
  }

  const bodyString =
    typeof params.rawBody === 'string'
      ? params.rawBody
      : Buffer.from(params.rawBody).toString('utf8');

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(bodyString);
  } catch {
    throw new DIPValidationError('Webhook body is not valid JSON.');
  }

  const parsed = WebhookEventEnvelopeSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new DIPValidationError('Webhook payload did not match expected event envelope.', {
      details: parsed.error.issues.map((i) => ({
        field: i.path.join('.') || undefined,
        reason: i.message,
      })),
    });
  }

  return parsed.data;
}

/**
 * In-memory replay protection / idempotent event deduplication store.
 * For multi-instance production servers, back this interface with persistent storage.
 */
export class InMemoryEventDeduplicationStore {
  private readonly seen = new Map<string, number>();

  constructor(private readonly ttlMs = 24 * 60 * 60 * 1000) {}

  public hasProcessed(eventId: string, nowMs = Date.now()): boolean {
    const expiresAt = this.seen.get(eventId);
    if (expiresAt === undefined) return false;
    if (expiresAt <= nowMs) {
      this.seen.delete(eventId);
      return false;
    }
    return true;
  }

  public markProcessed(eventId: string, nowMs = Date.now()): void {
    this.seen.set(eventId, nowMs + this.ttlMs);
  }

  public async processIdempotently<T>(
    eventId: string,
    handler: () => Promise<T> | T
  ): Promise<{ deduplicated: boolean; result?: T }> {
    if (this.hasProcessed(eventId)) {
      return { deduplicated: true };
    }
    const result = await handler();
    this.markProcessed(eventId);
    return { deduplicated: false, result };
  }
}

export function signTestWebhookPayload(params: {
  timestampSeconds: number;
  rawBody: string;
  secret: string;
  keyId?: string;
}): string {
  const sig = crypto
    .createHmac('sha256', params.secret)
    .update(`${params.timestampSeconds}.${params.rawBody}`)
    .digest('hex');
  return `t=${params.timestampSeconds},v1=${sig},kid=${params.keyId ?? 'k1'}`;
}
