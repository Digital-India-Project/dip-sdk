/**
 * Digital India Project SDK (`@digital-india/sdk`)
 *
 * Isomorphic (browser & Node.js) TypeScript client library for approved DIP API services.
 * Server-only webhook signature verification utilities are exported from `@digital-india/sdk/webhooks`.
 */

// Primary v1 SDK client & configuration
export { DIPClient } from './core/dipClient.js';
export type {
  DIPApiVersion,
  DIPClientConfig,
  DIPEnvironment,
  DIPLogger,
  DIPMiddleware,
  DIPRequestContext,
  DIPResponseContext,
  ResolvedDIPClientConfig,
} from './core/config.js';

// Authentication helpers (caller-supplied token providers only)
export {
  createCachingTokenProvider,
  createStaticTokenProvider,
  isTrustedOriginForToken,
  type RefreshableTokenProvider,
  type TokenProvider,
  type TokenProviderFn,
} from './core/auth.js';

// Transport adapters
export {
  FetchTransport,
  type TransportAdapter,
  type TransportRequest,
  type TransportResponse,
} from './core/transport.js';

// Retry & pagination helpers
export {
  DEFAULT_RETRY_CONFIG,
  computeBackoffDelayMs,
  parseRetryAfterMs,
  type RetryConfig,
} from './core/retry.js';
export {
  collectAllPages,
  iterateCursorPages,
  iterateItems,
  iteratePages,
  type CursorPaginatedResult,
  type CursorPaginationMeta,
  type PaginatedResult,
} from './core/pagination.js';

// Redaction utilities
export {
  REDACTED_VALUE,
  redactHeaders,
  redactSensitiveValue,
  redactUrl,
} from './core/redaction.js';

// Typed error hierarchy
export {
  DIPAPIError,
  DIPAbortError,
  DIPAuthenticationError,
  DIPAuthorizationError,
  DIPConfigurationError,
  DIPConflictError,
  DIPNetworkError,
  DIPNotFoundError,
  DIPRateLimitError,
  DIPSDKError,
  DIPServerError,
  DIPTimeoutError,
  DIPUnexpectedResponseError,
  DIPUnsupportedOperationError,
  DIPValidationError,
  mapHttpErrorToDIPAPIError,
  type DIPAPIErrorOptions,
  type DIPApiErrorCode,
  type DIPApiErrorDetail,
} from './core/errors.js';

// Resource clients
export { HealthClient } from './resources/health.js';
export { ProductsClient, ServicesClient } from './resources/catalogue.js';
export { ApplicationsClient, WorkflowClient } from './resources/applications.js';
export { DocumentsClient, type SignedUrlUploadOptions } from './resources/documents.js';
export { PaymentsClient } from './resources/payments.js';
export { WebhooksClient } from './resources/webhooks.js';
export { IntegrationsClient } from './resources/integrations.js';
export { SandboxAuthClient } from './resources/sandbox.js';
export type { IdempotentRequestCallOptions, RequestCallOptions } from './resources/types.js';

// Verified contracts & Zod schemas
export * from './contracts/common.js';
export * from './contracts/domain.js';
export * from './contracts/planned.js';

// Deterministically generated OpenAPI metadata
export {
  OPENAPI_OPERATIONS,
  OPENAPI_SPEC_META,
  type OpenApiOperationDescriptor,
  type OpenApiOperationId,
  type OpenApiPath,
} from './generated/openapi-types.js';

// Legacy v0.1.0 exports (preserved for backwards compatibility)
export { ApiClient, DipApiError, type ApiClientConfig } from './client.js';
export {
  ApiSathiClient,
  ApiSathiStatusSchema,
  DipindiaApiSathiGatewayStatusSchema,
  type ApiSathiStatus,
  type DipindiaApiSathiGatewayStatus,
} from './services/apiSathi.js';
export { DatabaseClient, QueryResultSchema, type QueryResult } from './services/database.js';
export { StorageClient, StorageObjectMetaSchema, type StorageObjectMeta } from './services/storage.js';
