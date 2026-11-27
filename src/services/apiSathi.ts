import { z } from 'zod';
import { ApiClient } from '../client.js';

export const ApiSathiStatusSchema = z.object({
  service: z.string(),
  status: z.string(),
});

export type ApiSathiStatus = z.infer<typeof ApiSathiStatusSchema>;

export const DipindiaApiSathiGatewayStatusSchema = z.object({
  success: z.boolean(),
  status: z.string(),
  message: z.string(),
  request_id: z.string().optional(),
  data: z
    .object({
      configured: z.boolean(),
      isSandboxTestKey: z.boolean().optional(),
      keyMode: z.string().optional(),
    })
    .passthrough(),
});

export type DipindiaApiSathiGatewayStatus = z.infer<typeof DipindiaApiSathiGatewayStatusSchema>;

/**
 * Legacy API Sathi service client (DIPINDIA Worker integration).
 * Note: For `dip-api` external provider contracts, prefer `client.integrations`.
 */
export class ApiSathiClient {
  constructor(private readonly client: ApiClient) {}

  /**
   * Legacy starter method preserved for backwards compatibility.
   * Note: Verified DIPINDIA worker exposes `GET /api/v1/apisathi/status` (see `getGatewayStatus`).
   */
  public async getStatus(signal?: AbortSignal): Promise<ApiSathiStatus> {
    return this.client.request({
      method: 'GET',
      url: '/api-sathi/status',
      signal,
      schema: ApiSathiStatusSchema,
    });
  }

  /**
   * Queries DIPINDIA worker's verified `GET /api/v1/apisathi/status` endpoint.
   */
  public async getGatewayStatus(signal?: AbortSignal): Promise<DipindiaApiSathiGatewayStatus> {
    return this.client.request({
      method: 'GET',
      url: '/api/v1/apisathi/status',
      signal,
      schema: DipindiaApiSathiGatewayStatusSchema,
    });
  }
}
