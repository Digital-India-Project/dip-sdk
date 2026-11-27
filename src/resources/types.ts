import type { z } from 'zod';
import type { ApiSuccessEnvelope } from '../contracts/common.js';

export interface RequestCallOptions {
  signal?: AbortSignal;
  correlationId?: string;
}

export interface IdempotentRequestCallOptions extends RequestCallOptions {
  /** Caller-supplied Idempotency-Key (8-128 chars: ^[a-zA-Z0-9_-]{8,128}$). */
  idempotencyKey?: string;
  /** Explicitly opt into or out of retrying on transient errors when Idempotency-Key is set. */
  allowIdempotentRetry?: boolean;
}

export interface ExecuteEnvelopeRequest<TData> {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
  schema: z.ZodType<TData>;
  authRequired: boolean;
  idempotencyKey?: string;
  allowIdempotentRetry?: boolean;
  signal?: AbortSignal;
  correlationId?: string;
}

export interface ExecuteRawRequest<TData> {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
  schema?: z.ZodType<TData>;
  authRequired: boolean;
  idempotencyKey?: string;
  allowIdempotentRetry?: boolean;
  signal?: AbortSignal;
  correlationId?: string;
}

export interface DIPRequestExecutor {
  requestEnvelope<TData>(request: ExecuteEnvelopeRequest<TData>): Promise<ApiSuccessEnvelope<TData>>;
  requestRaw<TData>(request: ExecuteRawRequest<TData>): Promise<TData>;
  generateIdempotencyKey(prefix?: string): string;
}
