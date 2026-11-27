import { z } from 'zod';
import { ApiClient } from '../client';

export const ApiSathiStatusSchema = z.object({
  service: z.string(),
  status: z.string(),
});

export type ApiSathiStatus = z.infer<typeof ApiSathiStatusSchema>;

export class ApiSathiClient {
  constructor(private readonly client: ApiClient) {}

  public async getStatus(signal?: AbortSignal): Promise<ApiSathiStatus> {
    return this.client.request({
      method: 'GET',
      url: '/api-sathi/status',
      signal,
      schema: ApiSathiStatusSchema,
    });
  }
}
