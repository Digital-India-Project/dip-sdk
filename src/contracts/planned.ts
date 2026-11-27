/**
 * Planned / Unimplemented Resource Contracts
 *
 * IMPORTANT: None of the operations in this file are currently exposed by the
 * verified `dip-api` `/api/v1` gateway. They are reserved type boundaries only
 * and MUST NOT be treated as live or callable endpoints until `dip-api` adds
 * and verifies the corresponding OpenAPI routes.
 */

export interface PlannedResourceStatus {
  readonly implemented: false;
  readonly blockingDependency: string;
}

/**
 * Planned Organizations contract (unimplemented in dip-api /api/v1).
 * Blocked on multi-tenant organization management endpoints in dip-api.
 */
export interface PlannedOrganizationSummary {
  id: string;
  tenant_id: string;
  legal_name: string;
  status: 'active' | 'suspended' | 'pending_verification';
}

/**
 * Planned User Profile contract.
 * Note: DIPINDIA worker exposes `GET /api/v1/auth/me`, while `dip-api`
 * does not yet expose a `/api/v1/users` or `/api/v1/auth/me` endpoint.
 */
export interface PlannedUserProfile {
  id: string;
  tenant_id?: string;
  role: string;
  scopes: string[];
}

/**
 * Planned Forms validation contract.
 * Note: DIPINDIA worker exposes `POST /api/v1/forms/validate`, while `dip-api`
 * validates `form_data` on application creation/update without a standalone forms endpoint.
 */
export interface PlannedFormValidationRequest {
  service_id: string;
  form_data: Record<string, string | number | boolean | null>;
}

/**
 * Planned Notifications contract (unimplemented in dip-api /api/v1).
 */
export interface PlannedNotificationRecord {
  id: string;
  channel: 'email' | 'sms' | 'in_app';
  status: 'queued' | 'sent' | 'failed';
  created_at: string;
}

/**
 * Planned Reports contract (unimplemented in dip-api /api/v1).
 */
export interface PlannedReportExport {
  report_id: string;
  format: 'csv' | 'json';
  status: 'pending' | 'ready' | 'expired';
}
