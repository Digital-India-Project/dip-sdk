import { z } from 'zod';
import { ListQueryOptionsSchema, MoneySchema } from './common.js';

// === Health & Metrics ===
export const HealthStatusSchema = z.object({
  status: z.string(),
  service: z.string(),
  version: z.string(),
  adapter_mode: z.string(),
});
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const MetricsSnapshotSchema = z.record(z.string(), z.unknown());
export type MetricsSnapshot = z.infer<typeof MetricsSnapshotSchema>;

// === Catalogue: Services & Products ===
export const ServiceCategorySchema = z.enum([
  'business_registration',
  'tax_compliance',
  'licensing',
  'certification',
  'document_assistance',
]);
export type ServiceCategory = z.infer<typeof ServiceCategorySchema>;

export const ServiceCatalogItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  category: ServiceCategorySchema,
  summary: z.string(),
  fee: MoneySchema,
  available: z.boolean(),
  required_documents: z.array(z.string()),
  updated_at: z.string(),
});
export type ServiceCatalogItem = z.infer<typeof ServiceCatalogItemSchema>;

export const ListServicesQuerySchema = ListQueryOptionsSchema.extend({
  category: ServiceCategorySchema.optional(),
});
export type ListServicesQuery = z.infer<typeof ListServicesQuerySchema>;

export const ProductCatalogItemSchema = z.object({
  id: z.string(),
  sku: z.string(),
  title: z.string(),
  category: z.string(),
  price: MoneySchema,
  available: z.boolean(),
  updated_at: z.string(),
});
export type ProductCatalogItem = z.infer<typeof ProductCatalogItemSchema>;

// === Applications & Workflow ===
export const ApplicationStatusSchema = z.enum([
  'draft',
  'submitted',
  'under_review',
  'action_required',
  'approved',
  'rejected',
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const FormDataValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export type FormDataValue = z.infer<typeof FormDataValueSchema>;

export const WorkflowHistoryEntrySchema = z.object({
  from_status: ApplicationStatusSchema.nullable(),
  to_status: ApplicationStatusSchema,
  actor_id: z.string(),
  reason: z.string(),
  timestamp_utc: z.string(),
});
export type WorkflowHistoryEntry = z.infer<typeof WorkflowHistoryEntrySchema>;

export const ApplicationRecordSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  owner_user_id: z.string(),
  service_id: z.string(),
  business_name: z.string(),
  applicant_reference: z.string().optional(),
  status: ApplicationStatusSchema,
  form_data: z.record(z.string(), FormDataValueSchema),
  workflow_history: z.array(WorkflowHistoryEntrySchema),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ApplicationRecord = z.infer<typeof ApplicationRecordSchema>;

export const ListApplicationsQuerySchema = ListQueryOptionsSchema.extend({
  status: ApplicationStatusSchema.optional(),
});
export type ListApplicationsQuery = z.infer<typeof ListApplicationsQuerySchema>;

export const CreateApplicationInputSchema = z.object({
  service_id: z.string().trim().min(2).max(64),
  business_name: z.string().trim().min(2).max(160),
  applicant_reference: z.string().trim().min(2).max(80).optional(),
  form_data: z.record(z.string(), FormDataValueSchema).optional(),
  submit_immediately: z.boolean().optional(),
});
export type CreateApplicationInput = z.infer<typeof CreateApplicationInputSchema>;

export const UpdateApplicationInputSchema = z.object({
  business_name: z.string().trim().min(2).max(160).optional(),
  form_data: z.record(z.string(), FormDataValueSchema).optional(),
});
export type UpdateApplicationInput = z.infer<typeof UpdateApplicationInputSchema>;

export const WorkflowTransitionTargetSchema = z.enum([
  'under_review',
  'action_required',
  'approved',
  'rejected',
]);
export type WorkflowTransitionTarget = z.infer<typeof WorkflowTransitionTargetSchema>;

export const WorkflowTransitionInputSchema = z.object({
  target_status: WorkflowTransitionTargetSchema,
  reason: z.string().trim().min(3).max(500),
});
export type WorkflowTransitionInput = z.infer<typeof WorkflowTransitionInputSchema>;

// === Documents ===
export const DocumentTypeSchema = z.enum([
  'identity_proof',
  'address_proof',
  'business_incorporation',
  'tax_certificate',
  'supporting_attachment',
]);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const DocumentMimeTypeSchema = z.enum(['application/pdf', 'image/png', 'image/jpeg']);
export type DocumentMimeType = z.infer<typeof DocumentMimeTypeSchema>;

export const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;

export const DocumentRecordSchema = z.object({
  id: z.string(),
  application_id: z.string(),
  tenant_id: z.string(),
  owner_user_id: z.string(),
  document_type: DocumentTypeSchema,
  file_name: z.string(),
  mime_type: z.string(),
  size_bytes: z.number().int().nonnegative(),
  verification_status: z.enum(['pending_upload', 'uploaded', 'verified', 'rejected']),
  created_at: z.string(),
});
export type DocumentRecord = z.infer<typeof DocumentRecordSchema>;

export const CreateDocumentUploadIntentInputSchema = z.object({
  document_type: DocumentTypeSchema,
  file_name: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-zA-Z0-9._-]+$/, 'File name may only contain alphanumeric, dot, underscore, or hyphen characters'),
  mime_type: DocumentMimeTypeSchema,
  size_bytes: z.number().int().min(1).max(MAX_DOCUMENT_UPLOAD_BYTES),
});
export type CreateDocumentUploadIntentInput = z.infer<typeof CreateDocumentUploadIntentInputSchema>;

export const DocumentUploadIntentResponseSchema = z.object({
  document: DocumentRecordSchema,
  upload_url: z.string().url(),
  expires_at_utc: z.string(),
});
export type DocumentUploadIntentResponse = z.infer<typeof DocumentUploadIntentResponseSchema>;

// === Payments ===
export const PaymentOrderStatusSchema = z.enum([
  'created',
  'authorized',
  'paid',
  'failed',
  'refund_requested',
  'refunded',
]);
export type PaymentOrderStatus = z.infer<typeof PaymentOrderStatusSchema>;

export const PaymentOrderRecordSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  owner_user_id: z.string(),
  application_id: z.string(),
  provider: z.enum(['cashfree_sandbox', 'cashfree']),
  provider_order_ref: z.string(),
  amount: MoneySchema,
  purpose: z.string(),
  status: PaymentOrderStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
});
export type PaymentOrderRecord = z.infer<typeof PaymentOrderRecordSchema>;

export const CreatePaymentOrderInputSchema = z.object({
  application_id: z.string().trim().min(3).max(64),
  amount: MoneySchema.refine((m) => m.amount_minor > 0, {
    message: 'Payment amount_minor must be greater than zero',
  }),
  purpose: z.string().trim().min(3).max(140),
});
export type CreatePaymentOrderInput = z.infer<typeof CreatePaymentOrderInputSchema>;

export const RequestRefundInputSchema = z.object({
  amount: MoneySchema.refine((m) => m.amount_minor > 0, {
    message: 'Refund amount_minor must be greater than zero',
  }),
  reason: z.string().trim().min(4).max(300),
});
export type RequestRefundInput = z.infer<typeof RequestRefundInputSchema>;

// === Webhooks ===
export const WebhookEventTypeSchema = z.enum([
  'application.submitted',
  'application.status_changed',
  'payment.paid',
  'payment.failed',
  'document.verified',
]);
export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;

export const CreateWebhookSubscriptionInputSchema = z.object({
  url: z
    .string()
    .trim()
    .url()
    .max(500)
    .refine((u) => u.startsWith('https://'), {
      message: 'Webhook destination URL must use HTTPS',
    }),
  events: z.array(WebhookEventTypeSchema).min(1).max(10),
  description: z.string().trim().min(3).max(160).optional(),
});
export type CreateWebhookSubscriptionInput = z.infer<typeof CreateWebhookSubscriptionInputSchema>;

export const WebhookSubscriptionRecordSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  description: z.string().optional(),
  active: z.boolean(),
  key_id: z.string(),
  created_at: z.string(),
});
export type WebhookSubscriptionRecord = z.infer<typeof WebhookSubscriptionRecordSchema>;

export const WebhookDeliveryRecordSchema = z.object({
  id: z.string(),
  subscription_id: z.string(),
  tenant_id: z.string(),
  event_id: z.string(),
  event_type: z.string(),
  attempt_count: z.number().int().nonnegative(),
  max_attempts: z.number().int().positive(),
  status: z.enum(['delivered_sandbox', 'retry_scheduled', 'dead_letter']),
  signature_header: z.string(),
  created_at: z.string(),
});
export type WebhookDeliveryRecord = z.infer<typeof WebhookDeliveryRecordSchema>;

export const WebhookEventEnvelopeSchema = z.object({
  event_id: z.string(),
  event_type: z.union([WebhookEventTypeSchema, z.string()]),
  version: z.literal('v1'),
  occurred_at_utc: z.string(),
  data: z.record(z.string(), z.unknown()),
});
export type WebhookEventEnvelope = z.infer<typeof WebhookEventEnvelopeSchema>;

// === Integrations / Providers ===
export const ProviderCategorySchema = z.enum([
  'gst_verification',
  'pan_verification',
  'business_verification',
  'digilocker',
  'entity_locker',
  'api_setu',
  'messaging',
]);
export type ProviderCategory = z.infer<typeof ProviderCategorySchema>;

export const ProviderMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: ProviderCategorySchema,
  adapter_mode: z.enum(['sandbox', 'planned_unconnected']),
  contract_approved: z.boolean(),
  timeout_ms: z.number().int().positive(),
  max_retries: z.number().int().nonnegative(),
  circuit_state: z.enum(['closed', 'open']),
  notes: z.string(),
});
export type ProviderMetadata = z.infer<typeof ProviderMetadataSchema>;

export const SandboxProviderCheckResultSchema = z.object({
  provider_id: z.string(),
  adapter_mode: z.literal('sandbox'),
  verified: z.boolean(),
  reference_id: z.string(),
  checked_at_utc: z.string(),
});
export type SandboxProviderCheckResult = z.infer<typeof SandboxProviderCheckResultSchema>;

// === Sandbox Auth (Non-Production Only) ===
export const SandboxTokenRequestSchema = z.object({
  subject: z.string().trim().min(2).max(80).optional(),
  tenant_id: z.string().trim().min(2).max(80).optional(),
  actor_type: z.enum(['human', 'machine']).optional(),
  scopes: z.array(z.string().trim().min(2).max(64)).min(1).max(20).optional(),
});
export type SandboxTokenRequest = z.infer<typeof SandboxTokenRequestSchema>;

export const SandboxTokenResponseSchema = z.object({
  token_type: z.literal('Bearer'),
  access_token: z.string(),
  expires_in_seconds: z.number().int().positive(),
  adapter_mode: z.literal('sandbox'),
  warning: z.string(),
});
export type SandboxTokenResponse = z.infer<typeof SandboxTokenResponseSchema>;
