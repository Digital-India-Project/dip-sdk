import { z } from 'zod';
import { ListQueryOptionsSchema, type ListQueryOptions } from '../contracts/common.js';
import {
  ListServicesQuerySchema,
  ProductCatalogItemSchema,
  ServiceCatalogItemSchema,
  type ListServicesQuery,
  type ProductCatalogItem,
  type ServiceCatalogItem,
} from '../contracts/domain.js';
import { DIPValidationError } from '../core/errors.js';
import { collectAllPages, iterateItems, iteratePages, type PaginatedResult } from '../core/pagination.js';
import type { DIPRequestExecutor, RequestCallOptions } from './types.js';

function assertSafePathSegment(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('/') || trimmed.includes('\\') || trimmed === '..' || trimmed === '.') {
    throw new DIPValidationError(`Invalid ${fieldName}.`, {
      details: [{ field: fieldName, reason: 'Must be a valid non-empty identifier without path separators.' }],
    });
  }
  return encodeURIComponent(trimmed);
}

function validateQueryInput<T>(schema: z.ZodType<T>, input?: unknown): T | undefined {
  if (!input) return undefined;
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new DIPValidationError('Invalid query parameters.', {
      details: parsed.error.issues.map((i) => ({
        field: i.path.join('.') || undefined,
        reason: i.message,
      })),
    });
  }
  return parsed.data;
}

export class ServicesClient {
  constructor(private readonly executor: DIPRequestExecutor) {}

  public async list(
    query?: ListServicesQuery,
    options?: RequestCallOptions
  ): Promise<PaginatedResult<ServiceCatalogItem>> {
    const validated = validateQueryInput(ListServicesQuerySchema, query);
    const res = await this.executor.requestEnvelope({
      method: 'GET',
      path: '/services',
      query: validated as Record<string, unknown> | undefined,
      schema: z.array(ServiceCatalogItemSchema),
      authRequired: false,
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

  public async get(serviceId: string, options?: RequestCallOptions): Promise<ServiceCatalogItem> {
    const safeId = assertSafePathSegment(serviceId, 'serviceId');
    const res = await this.executor.requestEnvelope({
      method: 'GET',
      path: `/services/${safeId}`,
      schema: ServiceCatalogItemSchema,
      authRequired: false,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }

  public iteratePages(
    query?: Omit<ListServicesQuery, 'page'>,
    options?: RequestCallOptions & { startPage?: number; maxPages?: number }
  ): AsyncGenerator<PaginatedResult<ServiceCatalogItem>, void, unknown> {
    return iteratePages(
      (page) => this.list({ ...query, page }, options),
      { startPage: options?.startPage, maxPages: options?.maxPages }
    );
  }

  public iterate(
    query?: Omit<ListServicesQuery, 'page'>,
    options?: RequestCallOptions & { startPage?: number; maxPages?: number }
  ): AsyncGenerator<ServiceCatalogItem, void, unknown> {
    return iterateItems(
      (page) => this.list({ ...query, page }, options),
      { startPage: options?.startPage, maxPages: options?.maxPages }
    );
  }

  public async listAll(
    query?: Omit<ListServicesQuery, 'page'>,
    options?: RequestCallOptions & { maxPages?: number }
  ): Promise<ServiceCatalogItem[]> {
    return collectAllPages((page) => this.list({ ...query, page }, options), {
      maxPages: options?.maxPages,
    });
  }
}

export class ProductsClient {
  constructor(private readonly executor: DIPRequestExecutor) {}

  public async list(
    query?: ListQueryOptions,
    options?: RequestCallOptions
  ): Promise<PaginatedResult<ProductCatalogItem>> {
    const validated = validateQueryInput(ListQueryOptionsSchema, query);
    const res = await this.executor.requestEnvelope({
      method: 'GET',
      path: '/products',
      query: validated as Record<string, unknown> | undefined,
      schema: z.array(ProductCatalogItemSchema),
      authRequired: false,
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

  public async get(productId: string, options?: RequestCallOptions): Promise<ProductCatalogItem> {
    const safeId = assertSafePathSegment(productId, 'productId');
    const res = await this.executor.requestEnvelope({
      method: 'GET',
      path: `/products/${safeId}`,
      schema: ProductCatalogItemSchema,
      authRequired: false,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }

  public iteratePages(
    query?: Omit<ListQueryOptions, 'page'>,
    options?: RequestCallOptions & { startPage?: number; maxPages?: number }
  ): AsyncGenerator<PaginatedResult<ProductCatalogItem>, void, unknown> {
    return iteratePages(
      (page) => this.list({ ...query, page }, options),
      { startPage: options?.startPage, maxPages: options?.maxPages }
    );
  }

  public iterate(
    query?: Omit<ListQueryOptions, 'page'>,
    options?: RequestCallOptions & { startPage?: number; maxPages?: number }
  ): AsyncGenerator<ProductCatalogItem, void, unknown> {
    return iterateItems(
      (page) => this.list({ ...query, page }, options),
      { startPage: options?.startPage, maxPages: options?.maxPages }
    );
  }
}
