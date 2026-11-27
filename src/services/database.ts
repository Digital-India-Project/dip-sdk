import { z } from 'zod';
import { ApiClient } from '../client';

export const QueryResultSchema = z.object({
  items: z.array(z.record(z.unknown())),
  nextCursor: z.string().nullable().optional(),
});

export type QueryResult = z.infer<typeof QueryResultSchema>;

/**
 * API-backed resource client for approved DIPINDIA data endpoints.
 * Does not hold direct database credentials or connect to production databases.
 */
export class DatabaseClient {
  constructor(private readonly client: ApiClient) {}

  public async listRecords(
    collection: string,
    options?: { cursor?: string; limit?: number; signal?: AbortSignal }
  ): Promise<QueryResult> {
    const safeCollection = encodeURIComponent(collection);
    return this.client.request({
      method: 'GET',
      url: `/data/${safeCollection}`,
      params: {
        cursor: options?.cursor,
        limit: options?.limit,
      },
      signal: options?.signal,
      schema: QueryResultSchema,
    });
  }
}
