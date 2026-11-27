import { z } from 'zod';
import {
  CreateWebhookSubscriptionInputSchema,
  WebhookDeliveryRecordSchema,
  WebhookSubscriptionRecordSchema,
  type CreateWebhookSubscriptionInput,
  type WebhookDeliveryRecord,
  type WebhookSubscriptionRecord,
} from '../contracts/domain.js';
import { DIPValidationError } from '../core/errors.js';
import type { DIPRequestExecutor, IdempotentRequestCallOptions, RequestCallOptions } from './types.js';

export class WebhooksClient {
  constructor(private readonly executor: DIPRequestExecutor) {}

  public async listSubscriptions(options?: RequestCallOptions): Promise<WebhookSubscriptionRecord[]> {
    const res = await this.executor.requestEnvelope({
      method: 'GET',
      path: '/webhooks/subscriptions',
      schema: z.array(WebhookSubscriptionRecordSchema),
      authRequired: true,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }

  public async createSubscription(
    input: CreateWebhookSubscriptionInput,
    options?: IdempotentRequestCallOptions
  ): Promise<WebhookSubscriptionRecord> {
    const parsed = CreateWebhookSubscriptionInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new DIPValidationError('Invalid webhook subscription input.', {
        details: parsed.error.issues.map((i) => ({
          field: i.path.join('.') || undefined,
          reason: i.message,
        })),
      });
    }

    const idempotencyKey = options?.idempotencyKey ?? this.executor.generateIdempotencyKey('wh_sub');
    const res = await this.executor.requestEnvelope({
      method: 'POST',
      path: '/webhooks/subscriptions',
      body: parsed.data,
      schema: WebhookSubscriptionRecordSchema,
      authRequired: true,
      idempotencyKey,
      allowIdempotentRetry: options?.allowIdempotentRetry ?? true,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }

  public async listDeliveries(options?: RequestCallOptions): Promise<WebhookDeliveryRecord[]> {
    const res = await this.executor.requestEnvelope({
      method: 'GET',
      path: '/webhooks/deliveries',
      schema: z.array(WebhookDeliveryRecordSchema),
      authRequired: true,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }
}
