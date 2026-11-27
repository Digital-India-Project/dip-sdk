import { z } from 'zod';
import {
  ProviderMetadataSchema,
  SandboxProviderCheckResultSchema,
  type ProviderMetadata,
  type SandboxProviderCheckResult,
} from '../contracts/domain.js';
import { DIPValidationError } from '../core/errors.js';
import type { DIPRequestExecutor, RequestCallOptions } from './types.js';

function assertSafeProviderId(providerId: string): string {
  const trimmed = providerId.trim();
  if (!trimmed || trimmed.includes('/') || trimmed.includes('\\') || trimmed === '.' || trimmed === '..') {
    throw new DIPValidationError('Invalid providerId.', {
      details: [{ field: 'providerId', reason: 'Must be a valid provider identifier.' }],
    });
  }
  return encodeURIComponent(trimmed);
}

export class IntegrationsClient {
  constructor(private readonly executor: DIPRequestExecutor) {}

  public async listProviders(options?: RequestCallOptions): Promise<ProviderMetadata[]> {
    const res = await this.executor.requestEnvelope({
      method: 'GET',
      path: '/integrations/providers',
      schema: z.array(ProviderMetadataSchema),
      authRequired: true,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }

  /**
   * Executes a synthetic sandbox check against an approved sandbox provider adapter.
   * Note: Live government/KYC verification connectors remain `planned_unconnected` in dip-api.
   */
  public async executeSandboxCheck(
    providerId: string,
    options?: RequestCallOptions
  ): Promise<SandboxProviderCheckResult> {
    const safeId = assertSafeProviderId(providerId);
    const res = await this.executor.requestEnvelope({
      method: 'POST',
      path: `/integrations/providers/${safeId}/sandbox-check`,
      body: {},
      schema: SandboxProviderCheckResultSchema,
      authRequired: true,
      allowIdempotentRetry: false,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }
}
