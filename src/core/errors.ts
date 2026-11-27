export type DIPApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'PROVIDER_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'ABORTED'
  | 'UNEXPECTED_RESPONSE'
  | 'CONFIGURATION_ERROR'
  | 'UNSUPPORTED_OPERATION';

export interface DIPApiErrorDetail {
  field?: string;
  reason: string;
}

export interface DIPAPIErrorOptions {
  status?: number;
  code: DIPApiErrorCode | string;
  correlationId?: string;
  requestId?: string;
  details?: DIPApiErrorDetail[];
  retryAfterSeconds?: number;
  isRetryable?: boolean;
  cause?: unknown;
}

export class DIPSDKError extends Error {
  public readonly code: string;
  public readonly correlationId?: string;

  constructor(message: string, options: { code: string; correlationId?: string; cause?: unknown }) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'DIPSDKError';
    this.code = options.code;
    this.correlationId = options.correlationId;
  }
}

export class DIPConfigurationError extends DIPSDKError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: 'CONFIGURATION_ERROR', cause });
    this.name = 'DIPConfigurationError';
  }
}

export class DIPUnsupportedOperationError extends DIPSDKError {
  constructor(message: string) {
    super(message, { code: 'UNSUPPORTED_OPERATION' });
    this.name = 'DIPUnsupportedOperationError';
  }
}

export class DIPAPIError extends DIPSDKError {
  public readonly status?: number;
  public readonly requestId?: string;
  public readonly details: DIPApiErrorDetail[];
  public readonly retryAfterSeconds?: number;
  public readonly isRetryable: boolean;

  constructor(message: string, options: DIPAPIErrorOptions) {
    super(message, {
      code: options.code,
      correlationId: options.correlationId ?? options.requestId,
      cause: options.cause,
    });
    this.name = 'DIPAPIError';
    this.status = options.status;
    this.requestId = options.requestId ?? options.correlationId;
    this.details = options.details ?? [];
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.isRetryable = options.isRetryable ?? false;
  }
}

export class DIPAuthenticationError extends DIPAPIError {
  constructor(message: string, options: Omit<DIPAPIErrorOptions, 'code'> = {}) {
    super(message, { ...options, code: 'UNAUTHENTICATED', isRetryable: false });
    this.name = 'DIPAuthenticationError';
  }
}

export class DIPAuthorizationError extends DIPAPIError {
  constructor(message: string, options: Omit<DIPAPIErrorOptions, 'code'> = {}) {
    super(message, { ...options, code: 'FORBIDDEN', isRetryable: false });
    this.name = 'DIPAuthorizationError';
  }
}

export class DIPValidationError extends DIPAPIError {
  constructor(message: string, options: Omit<DIPAPIErrorOptions, 'code'> = {}) {
    super(message, { ...options, code: 'VALIDATION_ERROR', isRetryable: false });
    this.name = 'DIPValidationError';
  }
}

export class DIPNotFoundError extends DIPAPIError {
  constructor(message: string, options: Omit<DIPAPIErrorOptions, 'code'> = {}) {
    super(message, { ...options, code: 'NOT_FOUND', isRetryable: false });
    this.name = 'DIPNotFoundError';
  }
}

export class DIPConflictError extends DIPAPIError {
  constructor(message: string, options: Omit<DIPAPIErrorOptions, 'code'> = {}) {
    super(message, { ...options, code: 'IDEMPOTENCY_CONFLICT', isRetryable: false });
    this.name = 'DIPConflictError';
  }
}

export class DIPRateLimitError extends DIPAPIError {
  constructor(message: string, options: Omit<DIPAPIErrorOptions, 'code'> = {}) {
    super(message, { ...options, code: 'RATE_LIMITED', isRetryable: true });
    this.name = 'DIPRateLimitError';
  }
}

export class DIPServerError extends DIPAPIError {
  constructor(message: string, options: Omit<DIPAPIErrorOptions, 'code'> & { code?: string } = {}) {
    super(message, {
      ...options,
      code: options.code ?? 'INTERNAL_ERROR',
      isRetryable: options.isRetryable ?? true,
    });
    this.name = 'DIPServerError';
  }
}

export class DIPNetworkError extends DIPAPIError {
  constructor(message: string, options: Omit<DIPAPIErrorOptions, 'code'> = {}) {
    super(message, { ...options, code: 'NETWORK_ERROR', isRetryable: true });
    this.name = 'DIPNetworkError';
  }
}

export class DIPTimeoutError extends DIPAPIError {
  constructor(message: string, options: Omit<DIPAPIErrorOptions, 'code'> = {}) {
    super(message, { ...options, code: 'TIMEOUT_ERROR', isRetryable: true });
    this.name = 'DIPTimeoutError';
  }
}

export class DIPAbortError extends DIPAPIError {
  constructor(message = 'Request was cancelled by caller.', options: Omit<DIPAPIErrorOptions, 'code'> = {}) {
    super(message, { ...options, code: 'ABORTED', isRetryable: false });
    this.name = 'DIPAbortError';
  }
}

export class DIPUnexpectedResponseError extends DIPAPIError {
  constructor(message: string, options: Omit<DIPAPIErrorOptions, 'code'> = {}) {
    super(message, { ...options, code: 'UNEXPECTED_RESPONSE', isRetryable: false });
    this.name = 'DIPUnexpectedResponseError';
  }
}

export function mapHttpErrorToDIPAPIError(params: {
  status: number;
  code?: string;
  message?: string;
  correlationId?: string;
  details?: DIPApiErrorDetail[];
  retryAfterSeconds?: number;
}): DIPAPIError {
  const { status, code, message, correlationId, details, retryAfterSeconds } = params;
  const msg = message || `API request failed with HTTP status ${status}`;
  const baseOptions = { status, correlationId, details, retryAfterSeconds };

  if (status === 401 || code === 'UNAUTHENTICATED') {
    return new DIPAuthenticationError(msg, baseOptions);
  }
  if (status === 403 || code === 'FORBIDDEN') {
    return new DIPAuthorizationError(msg, baseOptions);
  }
  if (status === 404 || code === 'NOT_FOUND') {
    return new DIPNotFoundError(msg, baseOptions);
  }
  if (status === 409 || code === 'IDEMPOTENCY_CONFLICT') {
    return new DIPConflictError(msg, baseOptions);
  }
  if (status === 429 || code === 'RATE_LIMITED') {
    return new DIPRateLimitError(msg, baseOptions);
  }
  if (status === 400 || status === 422 || code === 'VALIDATION_ERROR') {
    return new DIPValidationError(msg, baseOptions);
  }
  if (status >= 500 || code === 'PROVIDER_UNAVAILABLE' || code === 'INTERNAL_ERROR') {
    return new DIPServerError(msg, {
      ...baseOptions,
      code: code || (status === 503 ? 'PROVIDER_UNAVAILABLE' : 'INTERNAL_ERROR'),
      isRetryable: status === 502 || status === 503 || status === 504,
    });
  }

  return new DIPAPIError(msg, {
    ...baseOptions,
    code: code || 'UNEXPECTED_RESPONSE',
    isRetryable: false,
  });
}
