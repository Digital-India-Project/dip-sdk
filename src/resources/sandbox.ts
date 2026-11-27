import {
  SandboxTokenRequestSchema,
  SandboxTokenResponseSchema,
  type SandboxTokenRequest,
  type SandboxTokenResponse,
} from '../contracts/domain.js';
import { DIPConfigurationError, DIPValidationError } from '../core/errors.js';
import type { DIPRequestExecutor, RequestCallOptions } from './types.js';

/**
 * Non-production sandbox token helper (`POST /api/v1/sandbox/token`).
 * Blocked locally when client environment is configured as `'production'`.
 */
export class SandboxAuthClient {
  constructor(
    private readonly executor: DIPRequestExecutor,
    private readonly environment: 'production' | 'sandbox' | 'development'
  ) {}

  public async issueToken(
    input: SandboxTokenRequest = {},
    options?: RequestCallOptions
  ): Promise<SandboxTokenResponse> {
    if (this.environment === 'production') {
      throw new DIPConfigurationError(
        'Sandbox token minting is disabled when DIPClient environment is set to production.'
      );
    }

    const parsed = SandboxTokenRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new DIPValidationError('Invalid sandbox token request.', {
        details: parsed.error.issues.map((i) => ({
          field: i.path.join('.') || undefined,
          reason: i.message,
        })),
      });
    }

    const res = await this.executor.requestEnvelope({
      method: 'POST',
      path: '/sandbox/token',
      body: parsed.data,
      schema: SandboxTokenResponseSchema,
      authRequired: false,
      allowIdempotentRetry: false,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }
}
