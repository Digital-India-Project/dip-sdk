import { z } from 'zod';

export const ApiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'RATE_LIMITED',
  'IDEMPOTENCY_CONFLICT',
  'PROVIDER_UNAVAILABLE',
  'INTERNAL_ERROR',
]);

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorDetailSchema = z.object({
  field: z.string().optional(),
  reason: z.string(),
});

export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

export const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.union([ApiErrorCodeSchema, z.string()]),
    message: z.string(),
    correlation_id: z.string(),
    details: z.array(ApiErrorDetailSchema).default([]),
  }),
});

export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;

export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  has_more: z.boolean(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export const ApiResponseMetaSchema = z.object({
  api_version: z.literal('v1'),
  correlation_id: z.string(),
  adapter_mode: z.enum(['sandbox', 'live']),
  timestamp_utc: z.string(),
  pagination: PaginationMetaSchema.optional(),
});

export type ApiResponseMeta = z.infer<typeof ApiResponseMetaSchema>;

export interface ApiSuccessEnvelope<T> {
  data: T;
  meta: ApiResponseMeta;
}

export function createSuccessEnvelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    meta: ApiResponseMetaSchema,
  });
}

export const ListQueryOptionsSchema = z.object({
  page: z.number().int().min(1).max(1000).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'title', 'status']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  search: z.string().trim().max(120).optional(),
});

export type ListQueryOptions = z.infer<typeof ListQueryOptionsSchema>;

export const MoneySchema = z.object({
  amount_minor: z.number().int().nonnegative().max(1_000_000_000),
  currency: z.enum(['INR', 'USD', 'EUR']),
});

export type Money = z.infer<typeof MoneySchema>;

export interface RateLimitInfo {
  limit?: number;
  remaining?: number;
  resetEpochSeconds?: number;
  retryAfterSeconds?: number;
}
