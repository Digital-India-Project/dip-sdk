export type TokenProviderFn = () => string | Promise<string>;

export interface RefreshableTokenProvider {
  getAccessToken(): string | Promise<string>;
  refreshToken?(): Promise<string>;
}

export type TokenProvider = TokenProviderFn | RefreshableTokenProvider;

export async function resolveAccessToken(provider?: TokenProvider): Promise<string | undefined> {
  if (!provider) return undefined;
  const token =
    typeof provider === 'function' ? await provider() : await provider.getAccessToken();
  const trimmed = typeof token === 'string' ? token.trim() : '';
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function attemptTokenRefresh(provider?: TokenProvider): Promise<string | undefined> {
  if (!provider || typeof provider === 'function' || typeof provider.refreshToken !== 'function') {
    return undefined;
  }
  const token = await provider.refreshToken();
  const trimmed = typeof token === 'string' ? token.trim() : '';
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Wraps a static token string for server-side scripts or isolated sandbox tests.
 * Never hardcode production secrets or embed privileged tokens in browser bundles.
 */
export function createStaticTokenProvider(token: string): TokenProviderFn {
  return () => token;
}

/**
 * In-memory short-lived token cache with optional refresh buffer.
 * Deliberately keeps tokens in JS memory only (never localStorage or sessionStorage).
 */
export function createCachingTokenProvider(options: {
  fetchToken: () => Promise<{ accessToken: string; expiresInSeconds: number }>;
  refreshMarginSeconds?: number;
}): RefreshableTokenProvider {
  const marginMs = Math.max(5, options.refreshMarginSeconds ?? 30) * 1000;
  let cachedToken: string | null = null;
  let expiresAtMs = 0;
  let inflight: Promise<string> | null = null;

  const refresh = async (): Promise<string> => {
    if (inflight) return inflight;
    inflight = options
      .fetchToken()
      .then((res) => {
        cachedToken = res.accessToken;
        expiresAtMs = Date.now() + Math.max(1, res.expiresInSeconds) * 1000;
        return res.accessToken;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };

  return {
    async getAccessToken(): Promise<string> {
      if (cachedToken && Date.now() + marginMs < expiresAtMs) {
        return cachedToken;
      }
      return refresh();
    },
    async refreshToken(): Promise<string> {
      cachedToken = null;
      expiresAtMs = 0;
      return refresh();
    },
  };
}

/**
 * Ensures Bearer tokens are only sent to the explicitly configured trusted API origin.
 */
export function isTrustedOriginForToken(targetUrl: string, trustedOrigin: string): boolean {
  try {
    return new URL(targetUrl).origin === trustedOrigin;
  } catch {
    return false;
  }
}
