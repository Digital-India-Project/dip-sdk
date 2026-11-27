/* eslint-disable */
/**
 * Deterministically generated from src/api-spec.json.
 * Do not edit manually; run `npm run generate` to regenerate.
 */

export const OPENAPI_SPEC_META = {
  title: "DIP API — Digital India Project Gateway",
  version: "1.0.0-foundation",
  openapi: "3.1.0",
  specSha256: "e1514bbfac84a81375b8489f9e5f98963effddd2ed0502e3c7890da33dc50843",
  operationCount: 25,
} as const;

export type OpenApiPath =
  | '/applications'
  | '/applications/{applicationId}'
  | '/applications/{applicationId}/documents'
  | '/applications/{applicationId}/documents/upload-intent'
  | '/applications/{applicationId}/submit'
  | '/applications/{applicationId}/transition'
  | '/health'
  | '/integrations/providers'
  | '/integrations/providers/{providerId}/sandbox-check'
  | '/metrics'
  | '/openapi.json'
  | '/payments/orders'
  | '/payments/orders/{orderId}'
  | '/payments/orders/{orderId}/refunds'
  | '/payments/webhooks/cashfree'
  | '/products'
  | '/products/{productId}'
  | '/sandbox/token'
  | '/services'
  | '/services/{serviceId}'
  | '/webhooks/deliveries'
  | '/webhooks/subscriptions';

export type OpenApiOperationId =
  | 'listApplications'
  | 'createApplication'
  | 'getApplicationById'
  | 'updateApplication'
  | 'listApplicationDocuments'
  | 'createDocumentUploadIntent'
  | 'submitApplication'
  | 'transitionApplicationWorkflow'
  | 'getHealth'
  | 'listIntegrationProviders'
  | 'executeProviderSandboxCheck'
  | 'getMetrics'
  | 'getOpenApiSpec'
  | 'createPaymentOrder'
  | 'getPaymentOrder'
  | 'requestPaymentRefund'
  | 'receiveCashfreeWebhook'
  | 'listProducts'
  | 'getProductById'
  | 'mintSandboxToken'
  | 'listServices'
  | 'getServiceById'
  | 'listWebhookDeliveries'
  | 'listWebhookSubscriptions'
  | 'createWebhookSubscription';

export interface OpenApiOperationDescriptor {
  readonly method: string;
  readonly path: OpenApiPath;
  readonly operationId: OpenApiOperationId;
  readonly summary: string;
  readonly tags: readonly string[];
}

export const OPENAPI_OPERATIONS: readonly OpenApiOperationDescriptor[] = [
  {
    "method": "GET",
    "path": "/applications",
    "operationId": "listApplications",
    "summary": "List tenant-scoped applications",
    "tags": [
      "Applications"
    ]
  },
  {
    "method": "POST",
    "path": "/applications",
    "operationId": "createApplication",
    "summary": "Create draft or submitted application (Idempotency-Key required)",
    "tags": [
      "Applications"
    ]
  },
  {
    "method": "GET",
    "path": "/applications/{applicationId}",
    "operationId": "getApplicationById",
    "summary": "Get application by ID (enforces tenant & ownership)",
    "tags": [
      "Applications"
    ]
  },
  {
    "method": "PATCH",
    "path": "/applications/{applicationId}",
    "operationId": "updateApplication",
    "summary": "Update draft/action-required application",
    "tags": [
      "Applications"
    ]
  },
  {
    "method": "GET",
    "path": "/applications/{applicationId}/documents",
    "operationId": "listApplicationDocuments",
    "summary": "List document metadata for an application",
    "tags": [
      "Documents"
    ]
  },
  {
    "method": "POST",
    "path": "/applications/{applicationId}/documents/upload-intent",
    "operationId": "createDocumentUploadIntent",
    "summary": "Create validated document upload intent (Idempotency-Key required)",
    "tags": [
      "Documents"
    ]
  },
  {
    "method": "POST",
    "path": "/applications/{applicationId}/submit",
    "operationId": "submitApplication",
    "summary": "Submit draft application (Idempotency-Key required)",
    "tags": [
      "Applications"
    ]
  },
  {
    "method": "POST",
    "path": "/applications/{applicationId}/transition",
    "operationId": "transitionApplicationWorkflow",
    "summary": "Transition application workflow stage (requires workflow:review scope)",
    "tags": [
      "Workflow"
    ]
  },
  {
    "method": "GET",
    "path": "/health",
    "operationId": "getHealth",
    "summary": "Gateway health status",
    "tags": [
      "Observability"
    ]
  },
  {
    "method": "GET",
    "path": "/integrations/providers",
    "operationId": "listIntegrationProviders",
    "summary": "List registered external provider adapter contracts & readiness",
    "tags": [
      "Integrations"
    ]
  },
  {
    "method": "POST",
    "path": "/integrations/providers/{providerId}/sandbox-check",
    "operationId": "executeProviderSandboxCheck",
    "summary": "Execute sandbox provider check (non-production synthetic check)",
    "tags": [
      "Integrations"
    ]
  },
  {
    "method": "GET",
    "path": "/metrics",
    "operationId": "getMetrics",
    "summary": "Non-sensitive route-level metrics snapshot",
    "tags": [
      "Observability"
    ]
  },
  {
    "method": "GET",
    "path": "/openapi.json",
    "operationId": "getOpenApiSpec",
    "summary": "OpenAPI 3.1.0 specification generated from implemented routes",
    "tags": [
      "Documentation"
    ]
  },
  {
    "method": "POST",
    "path": "/payments/orders",
    "operationId": "createPaymentOrder",
    "summary": "Create payment order in minor currency units (Idempotency-Key required)",
    "tags": [
      "Payments"
    ]
  },
  {
    "method": "GET",
    "path": "/payments/orders/{orderId}",
    "operationId": "getPaymentOrder",
    "summary": "Get payment order status",
    "tags": [
      "Payments"
    ]
  },
  {
    "method": "POST",
    "path": "/payments/orders/{orderId}/refunds",
    "operationId": "requestPaymentRefund",
    "summary": "Request payment refund (requires payments:refund scope)",
    "tags": [
      "Payments"
    ]
  },
  {
    "method": "POST",
    "path": "/payments/webhooks/cashfree",
    "operationId": "receiveCashfreeWebhook",
    "summary": "Receive Cashfree webhook event (HMAC signature + replay + deduplication verified)",
    "tags": [
      "Payments"
    ]
  },
  {
    "method": "GET",
    "path": "/products",
    "operationId": "listProducts",
    "summary": "List product catalogue items",
    "tags": [
      "Catalogue"
    ]
  },
  {
    "method": "GET",
    "path": "/products/{productId}",
    "operationId": "getProductById",
    "summary": "Get product catalogue item by ID",
    "tags": [
      "Catalogue"
    ]
  },
  {
    "method": "POST",
    "path": "/sandbox/token",
    "operationId": "mintSandboxToken",
    "summary": "Mint synthetic sandbox bearer token (non-production only)",
    "tags": [
      "Sandbox"
    ]
  },
  {
    "method": "GET",
    "path": "/services",
    "operationId": "listServices",
    "summary": "List service catalogue items (paginated, filterable)",
    "tags": [
      "Catalogue"
    ]
  },
  {
    "method": "GET",
    "path": "/services/{serviceId}",
    "operationId": "getServiceById",
    "summary": "Get service catalogue item by ID",
    "tags": [
      "Catalogue"
    ]
  },
  {
    "method": "GET",
    "path": "/webhooks/deliveries",
    "operationId": "listWebhookDeliveries",
    "summary": "List tenant webhook delivery history",
    "tags": [
      "Webhooks"
    ]
  },
  {
    "method": "GET",
    "path": "/webhooks/subscriptions",
    "operationId": "listWebhookSubscriptions",
    "summary": "List tenant webhook subscriptions",
    "tags": [
      "Webhooks"
    ]
  },
  {
    "method": "POST",
    "path": "/webhooks/subscriptions",
    "operationId": "createWebhookSubscription",
    "summary": "Register HTTPS webhook subscription (SSRF-validated)",
    "tags": [
      "Webhooks"
    ]
  }
] as const;
