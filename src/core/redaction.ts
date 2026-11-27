const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-webhook-signature',
  'x-cf-signature',
  'x-client-secret',
]);

const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'sig',
  'signature',
  'secret',
  'key',
  'api_key',
  'apikey',
  'code',
  'password',
  'auth',
  'expires',
  'x-amz-signature',
  'x-amz-credential',
  'x-amz-security-token',
]);

const SENSITIVE_OBJECT_KEYS = new Set([
  'authorization',
  'password',
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'secret',
  'client_secret',
  'api_key',
  'apikey',
  'signature',
  'signed_url',
  'upload_url',
  'download_url',
  'aadhaar',
  'aadhaar_number',
  'pan',
  'pan_number',
]);

export const REDACTED_VALUE = '[REDACTED]';

export function redactHeaders(
  headers: Record<string, string> | undefined
): Record<string, string> {
  if (!headers) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_KEYS.has(key.toLowerCase())) {
      result[key] = REDACTED_VALUE;
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function redactUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.username || parsed.password) {
      parsed.username = REDACTED_VALUE;
      parsed.password = REDACTED_VALUE;
    }
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        parsed.searchParams.set(key, REDACTED_VALUE);
      }
    }
    return parsed.toString();
  } catch {
    return '[UNPARSEABLE_URL]';
  }
}

export function redactSensitiveValue(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_OBJECT_KEYS.has(k.toLowerCase())) {
        out[k] = REDACTED_VALUE;
      } else {
        out[k] = redactSensitiveValue(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}
