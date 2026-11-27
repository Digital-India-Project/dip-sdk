import { z } from 'zod';
import { ApiClient } from '../client.js';

export const QueryResultSchema = z.object({
  items: z.array(z.record(z.unknown())),
  nextCursor: z.string().nullable().optional(),
});

export type QueryResult = z.infer<typeof QueryResultSchema>;

/**
 * @deprecated Preserved solely for backwards-compatible exports from v0.1.0.
 * Neither `dip-api` nor `DIPINDIA` exposes a generic `/data/:collection` endpoint,
 * and external SDKs must never hold direct database credentials.
 * Use domain clients on `DIPClient` (`client.services`, `client.applications`, etc.) instead.
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
