import { z } from 'zod';
import {
  ApplicationRecordSchema,
  CreateApplicationInputSchema,
  ListApplicationsQuerySchema,
  UpdateApplicationInputSchema,
  WorkflowTransitionInputSchema,
  type ApplicationRecord,
  type CreateApplicationInput,
  type ListApplicationsQuery,
  type UpdateApplicationInput,
  type WorkflowTransitionInput,
} from '../contracts/domain.js';
import { DIPValidationError } from '../core/errors.js';
import { iterateItems, iteratePages, type PaginatedResult } from '../core/pagination.js';
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

function validateInput<T>(schema: z.ZodType<T>, input: unknown, label: string): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new DIPValidationError(`Invalid ${label}.`, {
      details: parsed.error.issues.map((i) => ({
        field: i.path.join('.') || undefined,
        reason: i.message,
      })),
    });
  }
  return parsed.data;
}

export class ApplicationsClient {
  constructor(private readonly executor: DIPRequestExecutor) {}

  public async list(
    query?: ListApplicationsQuery,
    options?: RequestCallOptions
  ): Promise<PaginatedResult<ApplicationRecord>> {
    const validated = query ? validateInput(ListApplicationsQuerySchema, query, 'list query') : undefined;
    const res = await this.executor.requestEnvelope({
      method: 'GET',
      path: '/applications',
      query: validated as Record<string, unknown> | undefined,
      schema: z.array(ApplicationRecordSchema),
      authRequired: true,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return {
      items: res.data,
      pagination: res.meta.pagination ?? {
        page: validated?.page ?? 1,
        limit: validated?.limit ?? 20,
        total: res.data.length,
        has_more: false,
      },
      meta: res.meta,
    };
  }

  public async get(applicationId: string, options?: RequestCallOptions): Promise<ApplicationRecord> {
    const safeId = assertSafeId(applicationId, 'applicationId');
    const res = await this.executor.requestEnvelope({
      method: 'GET',
      path: `/applications/${safeId}`,
      schema: ApplicationRecordSchema,
      authRequired: true,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }

  public async create(
    input: CreateApplicationInput,
    options?: IdempotentRequestCallOptions
  ): Promise<ApplicationRecord> {
    const body = validateInput(CreateApplicationInputSchema, input, 'application payload');
    const idempotencyKey = options?.idempotencyKey ?? this.executor.generateIdempotencyKey('app_create');
    const res = await this.executor.requestEnvelope({
      method: 'POST',
      path: '/applications',
      body,
      schema: ApplicationRecordSchema,
      authRequired: true,
      idempotencyKey,
      allowIdempotentRetry: options?.allowIdempotentRetry ?? true,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }

  public async update(
    applicationId: string,
    patch: UpdateApplicationInput,
    options?: RequestCallOptions
  ): Promise<ApplicationRecord> {
    const safeId = assertSafeId(applicationId, 'applicationId');
    const body = validateInput(UpdateApplicationInputSchema, patch, 'application patch');
    const res = await this.executor.requestEnvelope({
      method: 'PATCH',
      path: `/applications/${safeId}`,
      body,
      schema: ApplicationRecordSchema,
      authRequired: true,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }

  public async submit(
    applicationId: string,
    options?: IdempotentRequestCallOptions
  ): Promise<ApplicationRecord> {
    const safeId = assertSafeId(applicationId, 'applicationId');
    const idempotencyKey = options?.idempotencyKey ?? this.executor.generateIdempotencyKey('app_submit');
    const res = await this.executor.requestEnvelope({
      method: 'POST',
      path: `/applications/${safeId}/submit`,
      body: {},
      schema: ApplicationRecordSchema,
      authRequired: true,
      idempotencyKey,
      allowIdempotentRetry: options?.allowIdempotentRetry ?? true,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }

  public iteratePages(
    query?: Omit<ListApplicationsQuery, 'page'>,
    options?: RequestCallOptions & { startPage?: number; maxPages?: number }
  ): AsyncGenerator<PaginatedResult<ApplicationRecord>, void, unknown> {
    return iteratePages(
      (page) => this.list({ ...query, page }, options),
      { startPage: options?.startPage, maxPages: options?.maxPages }
    );
  }

  public iterate(
    query?: Omit<ListApplicationsQuery, 'page'>,
    options?: RequestCallOptions & { startPage?: number; maxPages?: number }
  ): AsyncGenerator<ApplicationRecord, void, unknown> {
    return iterateItems(
      (page) => this.list({ ...query, page }, options),
      { startPage: options?.startPage, maxPages: options?.maxPages }
    );
  }
}

export class WorkflowClient {
  constructor(private readonly executor: DIPRequestExecutor) {}

  public async transition(
    applicationId: string,
    input: WorkflowTransitionInput,
    options?: IdempotentRequestCallOptions
  ): Promise<ApplicationRecord> {
    const safeId = assertSafeId(applicationId, 'applicationId');
    const body = validateInput(WorkflowTransitionInputSchema, input, 'workflow transition');
    const idempotencyKey = options?.idempotencyKey ?? this.executor.generateIdempotencyKey('wf_trans');
    const res = await this.executor.requestEnvelope({
      method: 'POST',
      path: `/applications/${safeId}/transition`,
      body,
      schema: ApplicationRecordSchema,
      authRequired: true,
      idempotencyKey,
      allowIdempotentRetry: options?.allowIdempotentRetry ?? false,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }
}
