/**
 * Sandbox / Mock Example (Non-Production Only)
 *
 * Demonstrates end-to-end sandbox workflow against a local or sandbox `dip-api`
 * instance (`adapterMode === 'sandbox'`). Never uses production secrets or live payments.
 */
import { DIPClient, createCachingTokenProvider } from '../src/index.js';

export async function runSandboxEndToEnd(sandboxBaseUrl: string) {
  const bootstrapClient = new DIPClient({
    baseUrl: sandboxBaseUrl,
    environment: 'sandbox',
    allowInsecureHttpInDev: true,
  });

  const health = await bootstrapClient.health.getHealth();
  console.log('Gateway health:', health);

  const authClient = new DIPClient({
    baseUrl: sandboxBaseUrl,
    environment: 'sandbox',
    allowInsecureHttpInDev: true,
    tokenProvider: createCachingTokenProvider({
      fetchToken: async () => {
        const issued = await bootstrapClient.sandbox.issueToken({
          subject: 'usr_sandbox_demo',
          tenant_id: 'tenant_sandbox_demo',
        });
        return {
          accessToken: issued.access_token,
          expiresInSeconds: issued.expires_in_seconds,
        };
      },
    }),
  });

  const services = await authClient.services.list({ page: 1, limit: 5 });
  const app = await authClient.applications.create({
    service_id: services.items[0]?.id ?? 'svc_msme_assist',
    business_name: 'Sandbox Demo LLP',
    submit_immediately: true,
  });

  const order = await authClient.payments.createOrder({
    application_id: app.id,
    amount: { amount_minor: 149900, currency: 'INR' },
    purpose: 'Sandbox service fee',
  });

  return { health, app, order };
}
