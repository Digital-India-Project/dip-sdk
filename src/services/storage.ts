import { z } from 'zod';
import { ApiClient } from '../client';

export const StorageObjectMetaSchema = z.object({
  key: z.string(),
  contentType: z.string().optional(),
  sizeBytes: z.number().nonnegative().optional(),
});

export type StorageObjectMeta = z.infer<typeof StorageObjectMetaSchema>;

/**
 * API-backed storage resource client for approved DIPINDIA storage endpoints.
 * Does not hold direct object-storage credentials.
 */
export class StorageClient {
  constructor(private readonly client: ApiClient) {}

  public async getMetadata(
    objectKey: string,
    signal?: AbortSignal
  ): Promise<StorageObjectMeta> {
    const safeKey = encodeURIComponent(objectKey);
    return this.client.request({
      method: 'GET',
      url: `/storage/objects/${safeKey}`,
      signal,
      schema: StorageObjectMetaSchema,
    });
  }
}
