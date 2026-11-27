/**
 * Functional Example (Node.js Backend Integration)
 *
 * Uses caller-supplied in-memory token caching, typed error handling,
 * pagination iteration, and AbortSignal cancellation against a DIP API gateway.
 */
import {
  DIPAPIError,
  DIPClient,
  DIPRateLimitError,
  createCachingTokenProvider,
} from '../src/index.js';

export async function runNodeQuickstart(options: {
  baseUrl: string;
  fetchAccessToken: () => Promise<{ accessToken: string; expiresInSeconds: number }>;
}) {
  const tokenProvider = createCachingTokenProvider({
    fetchToken: options.fetchAccessToken,
    refreshMarginSeconds: 30,
  });

  const client = new DIPClient({
    baseUrl: options.baseUrl,
    environment: 'sandbox',
    timeoutMs: 15_000,
    tokenProvider,
  });

  // 1. Public service catalogue with async pagination
  const firstPage = await client.services.list({ page: 1, limit: 10 });
  console.log(`Found ${firstPage.pagination.total} services.`);

  // 2. Authenticated application creation with deterministic Idempotency-Key
  const controller = new AbortController();
  try {
    const application = await client.applications.create(
      {
        service_id: firstPage.items[0]?.id ?? 'svc_msme_assist',
        business_name: 'Sample MSME Enterprises Pvt Ltd',
        submit_immediately: false,
      },
      {
        idempotencyKey: 'example_app_create_001',
        signal: controller.signal,
      }
    );
    console.log(`Created application draft: ${application.id}`);
    return application;
  } catch (error) {
    if (error instanceof DIPRateLimitError) {
      console.warn(`Rate limited. Retry after ${error.retryAfterSeconds ?? 'unknown'}s`);
    } else if (error instanceof DIPAPIError) {
      console.error(`API error [${error.code}] (correlation: ${error.correlationId}): ${error.message}`);
    }
    throw error;
  }
}
