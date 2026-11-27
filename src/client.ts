import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { z } from 'zod';

export type LegacyTokenProvider = () => string | Promise<string>;

export interface ApiClientConfig {
  baseUrl: string;
  timeoutMs?: number;
  getToken?: LegacyTokenProvider;
  userAgent?: string;
  allowInsecureHttpInDev?: boolean;
}

export class DipApiError extends Error {
  public readonly status?: number;
  public readonly code?: string;
  public readonly requestId?: string;

  constructor(
    message: string,
    options?: { status?: number; code?: string; requestId?: string }
  ) {
    super(message);
    this.name = 'DipApiError';
    this.status = options?.status;
    this.code = options?.code;
    this.requestId = options?.requestId;
  }
}

const ApiClientConfigSchema = z.object({
  baseUrl: z.string().url(),
  timeoutMs: z.number().int().positive().max(120000).optional(),
  userAgent: z.string().min(1).optional(),
  allowInsecureHttpInDev: z.boolean().optional(),
});

/**
 * Legacy Axios-based client preserved from v0.1.0.
 * For new integrations, prefer `DIPClient` which provides Fetch transport,
 * typed resource modules, bounded retries, redaction, and pagination helpers.
 */
export class ApiClient {
  private readonly http: AxiosInstance;
  private readonly baseOrigin: string;
  private readonly getToken?: LegacyTokenProvider;

  constructor(config: ApiClientConfig) {
    const parsed = ApiClientConfigSchema.parse({
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      userAgent: config.userAgent,
      allowInsecureHttpInDev: config.allowInsecureHttpInDev,
    });

    const url = new URL(parsed.baseUrl);
    if (url.username || url.password) {
      throw new Error('ApiClient baseUrl must not contain embedded credentials');
    }
    if (url.protocol !== 'https:' && !parsed.allowInsecureHttpInDev) {
      throw new Error(
        'ApiClient requires HTTPS baseUrl unless allowInsecureHttpInDev is true'
      );
    }

    this.baseOrigin = url.origin;
    this.getToken = config.getToken;

    this.http = axios.create({
      baseURL: parsed.baseUrl.replace(/\/+$/, ''),
      timeout: parsed.timeoutMs ?? 15000,
      maxRedirects: 0,
      headers: {
        'Content-Type': 'application/json',
        ...(parsed.userAgent ? { 'User-Agent': parsed.userAgent } : {}),
      },
    });
  }

  public async request<TResponse>(
    config: AxiosRequestConfig & { schema?: z.ZodType<TResponse> }
  ): Promise<TResponse> {
    const { schema, ...axiosConfig } = config;
    const headers: Record<string, string> = {
      ...(axiosConfig.headers as Record<string, string> | undefined),
    };

    if (this.getToken) {
      const token = await this.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    try {
      const response = await this.http.request<TResponse>({
        ...axiosConfig,
        headers,
      });

      if (schema) {
        return schema.parse(response.data);
      }

      return response.data;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new DipApiError('Response validation failed', {
          code: 'VALIDATION_ERROR',
        });
      }

      if (axios.isAxiosError(error)) {
        const axiosErr = error as AxiosError<{ code?: string; message?: string }>;
        const requestId =
          typeof axiosErr.response?.headers?.['x-request-id'] === 'string'
            ? axiosErr.response.headers['x-request-id']
            : typeof axiosErr.response?.headers?.['x-correlation-id'] === 'string'
              ? axiosErr.response.headers['x-correlation-id']
              : undefined;

        throw new DipApiError(
          axiosErr.response?.data?.message || axiosErr.message || 'API request failed',
          {
            status: axiosErr.response?.status,
            code: axiosErr.response?.data?.code || axiosErr.code,
            requestId,
          }
        );
      }

      throw error;
    }
  }

  public getOrigin(): string {
    return this.baseOrigin;
  }
}
