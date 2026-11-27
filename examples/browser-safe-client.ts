/**
 * Functional Example (Browser-Safe Client Integration)
 *
 * Security rules demonstrated:
 * - Never store access tokens in localStorage or sessionStorage.
 * - Supply short-lived user tokens from an in-memory auth session callback.
 * - Never import `@digital-india/sdk/webhooks` (server-only) in browser bundles.
 */
import { DIPClient, DIPValidationError } from '../src/index.js';

export function createBrowserSafeDipClient(
  apiBaseUrl: string,
  getInMemorySessionToken: () => Promise<string>
): DIPClient {
  return new DIPClient({
    baseUrl: apiBaseUrl,
    environment: 'production',
    timeoutMs: 15_000,
    tokenProvider: getInMemorySessionToken,
  });
}

export async function uploadApplicationDocumentFromBrowser(params: {
  client: DIPClient;
  applicationId: string;
  fileBytes: Uint8Array;
  fileName: string;
  mimeType: 'application/pdf' | 'image/png' | 'image/jpeg';
  signal?: AbortSignal;
}) {
  try {
    const intent = await params.client.documents.createUploadIntent(
      params.applicationId,
      {
        document_type: 'identity_proof',
        file_name: params.fileName,
        mime_type: params.mimeType,
        size_bytes: params.fileBytes.byteLength,
      },
      { signal: params.signal }
    );

    const uploadRes = await params.client.documents.uploadToSignedUrl({
      uploadUrl: intent.upload_url,
      expiresAtUtc: intent.expires_at_utc,
      data: params.fileBytes,
      contentType: params.mimeType,
      signal: params.signal,
      onProgress: ({ percent }) => {
        console.log(`Upload progress: ${percent}%`);
      },
    });

    return { document: intent.document, uploadStatus: uploadRes.status };
  } catch (err) {
    if (err instanceof DIPValidationError) {
      console.warn('Validation failed:', err.details);
    }
    throw err;
  }
}
