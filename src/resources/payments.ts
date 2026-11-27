import {
  CreatePaymentOrderInputSchema,
  PaymentOrderRecordSchema,
  RequestRefundInputSchema,
  type CreatePaymentOrderInput,
  type PaymentOrderRecord,
  type RequestRefundInput,
} from '../contracts/domain.js';
import { DIPValidationError } from '../core/errors.js';
import type { DIPRequestExecutor, IdempotentRequestCallOptions, RequestCallOptions } from './types.js';

function assertSafeId(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('/') || trimmed.includes('\\') || trimmed === '.' || trimmed === '..') {
    throw new DIPValidationError(`Invalid ${field}.`, {
      details: [{ field, reason: 'Must be a valid identifier without path separators.' }],
    });
  }
  return encodeURIComponent(trimmed);
}

/**
 * Payment resource client for verified `dip-api` `/api/v1/payments/*` routes.
 *
 * Security & reliability rules:
 * - Uses integer minor currency units (e.g. INR paise).
 * - Requires Idempotency-Key on order creation and refund requests.
 * - Never retries payment mutations automatically unless caller explicitly opts in
 *   with `allowIdempotentRetry: true` and a deterministic caller-supplied `idempotencyKey`.
 * - Never exposes gateway secret keys or treats client-side status as final settlement.
 */
export class PaymentsClient {
  constructor(private readonly executor: DIPRequestExecutor) {}

  public async createOrder(
    input: CreatePaymentOrderInput,
    options?: IdempotentRequestCallOptions
  ): Promise<PaymentOrderRecord> {
    const parsed = CreatePaymentOrderInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new DIPValidationError('Invalid payment order input.', {
        details: parsed.error.issues.map((i) => ({
          field: i.path.join('.') || undefined,
          reason: i.message,
        })),
      });
    }

    const idempotencyKey = options?.idempotencyKey ?? this.executor.generateIdempotencyKey('pay_order');
    // Only allow automatic retry on payment order creation if caller supplied an explicit idempotencyKey
    // AND explicitly opted into allowIdempotentRetry === true.
    const allowRetry = Boolean(options?.idempotencyKey && options?.allowIdempotentRetry === true);

    const res = await this.executor.requestEnvelope({
      method: 'POST',
      path: '/payments/orders',
      body: parsed.data,
      schema: PaymentOrderRecordSchema,
      authRequired: true,
      idempotencyKey,
      allowIdempotentRetry: allowRetry,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }

  public async getOrder(orderId: string, options?: RequestCallOptions): Promise<PaymentOrderRecord> {
    const safeId = assertSafeId(orderId, 'orderId');
    const res = await this.executor.requestEnvelope({
      method: 'GET',
      path: `/payments/orders/${safeId}`,
      schema: PaymentOrderRecordSchema,
      authRequired: true,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }

  public async requestRefund(
    orderId: string,
    input: RequestRefundInput,
    options?: IdempotentRequestCallOptions
  ): Promise<PaymentOrderRecord> {
    const safeId = assertSafeId(orderId, 'orderId');
    const parsed = RequestRefundInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new DIPValidationError('Invalid refund request input.', {
        details: parsed.error.issues.map((i) => ({
          field: i.path.join('.') || undefined,
          reason: i.message,
        })),
      });
    }

    const idempotencyKey = options?.idempotencyKey ?? this.executor.generateIdempotencyKey('pay_refund');
    const allowRetry = Boolean(options?.idempotencyKey && options?.allowIdempotentRetry === true);

    const res = await this.executor.requestEnvelope({
      method: 'POST',
      path: `/payments/orders/${safeId}/refunds`,
      body: parsed.data,
      schema: PaymentOrderRecordSchema,
      authRequired: true,
      idempotencyKey,
      allowIdempotentRetry: allowRetry,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }
}
