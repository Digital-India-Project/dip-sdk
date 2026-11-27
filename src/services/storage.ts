import { z } from 'zod';
import { ApiClient } from '../client.js';

export const StorageObjectMetaSchema = z.object({
  key: z.string(),
  contentType: z.string().optional(),
  sizeBytes: z.number().nonnegative().optional(),
});

export type StorageObjectMeta = z.infer<typeof StorageObjectMetaSchema>;

/**
 * @deprecated Preserved for backwards-compatible exports from v0.1.0.
 * For `dip-api` `/api/v1` document metadata and upload intents, use `client.documents`
 * (`DocumentsClient`). Never store direct R2/object-storage credentials in SDK clients.
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
