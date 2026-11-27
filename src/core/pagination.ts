import type { ApiResponseMeta, PaginationMeta } from '../contracts/common.js';

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
  meta: ApiResponseMeta;
}

export interface CursorPaginationMeta {
  next_cursor: string | null;
  limit: number;
  has_more: boolean;
}

export interface CursorPaginatedResult<T> {
  items: T[];
  pagination: CursorPaginationMeta;
  meta: ApiResponseMeta;
}

export async function* iteratePages<T>(
  fetchPage: (page: number) => Promise<PaginatedResult<T>>,
  options?: { startPage?: number; maxPages?: number }
): AsyncGenerator<PaginatedResult<T>, void, unknown> {
  let page = options?.startPage ?? 1;
  const maxPages = options?.maxPages ?? 1000;
  let yielded = 0;

  while (yielded < maxPages) {
    const result = await fetchPage(page);
    yield result;
    yielded += 1;

    if (!result.pagination.has_more) {
      break;
    }
    page += 1;
  }
}

export async function* iterateItems<T>(
  fetchPage: (page: number) => Promise<PaginatedResult<T>>,
  options?: { startPage?: number; maxPages?: number }
): AsyncGenerator<T, void, unknown> {
  for await (const pageResult of iteratePages(fetchPage, options)) {
    for (const item of pageResult.items) {
      yield item;
    }
  }
}

export async function collectAllPages<T>(
  fetchPage: (page: number) => Promise<PaginatedResult<T>>,
  options?: { startPage?: number; maxPages?: number }
): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterateItems(fetchPage, options)) {
    items.push(item);
  }
  return items;
}

export async function* iterateCursorPages<T>(
  fetchPage: (cursor?: string) => Promise<CursorPaginatedResult<T>>,
  options?: { initialCursor?: string; maxPages?: number }
): AsyncGenerator<CursorPaginatedResult<T>, void, unknown> {
  let cursor = options?.initialCursor;
  const maxPages = options?.maxPages ?? 1000;
  let yielded = 0;

  while (yielded < maxPages) {
    const result = await fetchPage(cursor);
    yield result;
    yielded += 1;

    if (!result.pagination.has_more || !result.pagination.next_cursor) {
      break;
    }
    cursor = result.pagination.next_cursor;
  }
}
