import { z } from 'zod';
import {
  HealthStatusSchema,
  MetricsSnapshotSchema,
  type HealthStatus,
  type MetricsSnapshot,
} from '../contracts/domain.js';
import type { DIPRequestExecutor, RequestCallOptions } from './types.js';

export class HealthClient {
  constructor(private readonly executor: DIPRequestExecutor) {}

  public async getHealth(options?: RequestCallOptions): Promise<HealthStatus> {
    const res = await this.executor.requestEnvelope({
      method: 'GET',
      path: '/health',
      schema: HealthStatusSchema,
      authRequired: false,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }

  public async getMetrics(options?: RequestCallOptions): Promise<MetricsSnapshot> {
    const res = await this.executor.requestEnvelope({
      method: 'GET',
      path: '/metrics',
      schema: MetricsSnapshotSchema,
      authRequired: false,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }

  public async getOpenApiSpec(options?: RequestCallOptions): Promise<Record<string, unknown>> {
    return this.executor.requestRaw({
      method: 'GET',
      path: '/openapi.json',
      schema: z.record(z.string(), z.unknown()),
      authRequired: false,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
  }
}
