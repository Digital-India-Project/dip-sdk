import { z } from 'zod';
import {
  CreateDocumentUploadIntentInputSchema,
  DocumentMimeTypeSchema,
  DocumentRecordSchema,
  DocumentUploadIntentResponseSchema,
  MAX_DOCUMENT_UPLOAD_BYTES,
  type CreateDocumentUploadIntentInput,
  type DocumentRecord,
  type DocumentUploadIntentResponse,
} from '../contracts/domain.js';
import { DIPAbortError, DIPNetworkError, DIPValidationError } from '../core/errors.js';
import type { DIPRequestExecutor, IdempotentRequestCallOptions, RequestCallOptions } from './types.js';

function assertSafeId(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('/') || trimmed.includes('\\') || trimmed === '.' || trimmed === '..') {
    throw new DIPValidationError(`Invalid ${field}.`, {
      details: [{ field, reason: 'Must be a valid identifier without path separators.' }],
    });
  }
  return encodeURIComponent(trimmed);
}

export interface SignedUrlUploadOptions {
  /** Signed URL returned from createUploadIntent(). Never logged by the SDK. */
  uploadUrl: string;
  /** Expected expiration timestamp (UTC ISO-8601). Rejected locally if already expired. */
  expiresAtUtc?: string;
  /** Binary payload to upload. */
  data: Uint8Array | ArrayBuffer;
  /** Validated MIME type matching the upload intent. */
  contentType: z.infer<typeof DocumentMimeTypeSchema>;
  /** Optional AbortSignal for cancellation. */
  signal?: AbortSignal;
  /** Optional progress callback (reports 0..100 when content length is known). */
  onProgress?: (progress: { loadedBytes: number; totalBytes: number; percent: number }) => void;
  /** Optional fetch implementation override (for tests). */
  fetchImpl?: typeof fetch;
  /** Allow HTTP signed URLs strictly in local dev/test harnesses (default: false). */
  allowInsecureHttpInDev?: boolean;
}

export class DocumentsClient {
  constructor(private readonly executor: DIPRequestExecutor) {}

  public async listForApplication(
    applicationId: string,
    options?: RequestCallOptions
  ): Promise<DocumentRecord[]> {
    const safeId = assertSafeId(applicationId, 'applicationId');
    const res = await this.executor.requestEnvelope({
      method: 'GET',
      path: `/applications/${safeId}/documents`,
      schema: z.array(DocumentRecordSchema),
      authRequired: true,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }

  public async createUploadIntent(
    applicationId: string,
    input: CreateDocumentUploadIntentInput,
    options?: IdempotentRequestCallOptions
  ): Promise<DocumentUploadIntentResponse> {
    const safeId = assertSafeId(applicationId, 'applicationId');
    const parsed = CreateDocumentUploadIntentInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new DIPValidationError('Invalid document upload intent.', {
        details: parsed.error.issues.map((i) => ({
          field: i.path.join('.') || undefined,
          reason: i.message,
        })),
      });
    }

    const idempotencyKey = options?.idempotencyKey ?? this.executor.generateIdempotencyKey('doc_intent');
    const res = await this.executor.requestEnvelope({
      method: 'POST',
      path: `/applications/${safeId}/documents/upload-intent`,
      body: parsed.data,
      schema: DocumentUploadIntentResponseSchema,
      authRequired: true,
      idempotencyKey,
      allowIdempotentRetry: options?.allowIdempotentRetry ?? true,
      signal: options?.signal,
      correlationId: options?.correlationId,
    });
    return res.data;
  }

  /**
   * Uploads bytes to a pre-signed URL issued by createUploadIntent().
   * Enforces size limits, allowed MIME types, expiration check, and HTTPS.
   * Never attaches DIP API Bearer tokens to external signed URLs and never logs URLs or contents.
   */
  public async uploadToSignedUrl(options: SignedUrlUploadOptions): Promise<{ status: number; etag?: string }> {
    const mimeCheck = DocumentMimeTypeSchema.safeParse(options.contentType);
    if (!mimeCheck.success) {
      throw new DIPValidationError('Unsupported document content type.', {
        details: [{ field: 'contentType', reason: 'Allowed: application/pdf, image/png, image/jpeg' }],
      });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(options.uploadUrl);
    } catch {
      throw new DIPValidationError('Invalid signed upload URL.');
    }

    if (parsedUrl.protocol !== 'https:' && !(options.allowInsecureHttpInDev && parsedUrl.protocol === 'http:')) {
      throw new DIPValidationError('Signed upload URL must use HTTPS.');
    }

    if (options.expiresAtUtc) {
      const expiresMs = Date.parse(options.expiresAtUtc);
      if (Number.isFinite(expiresMs) && expiresMs <= Date.now()) {
        throw new DIPValidationError('Signed upload URL has expired.', {
          details: [{ field: 'expiresAtUtc', reason: 'Request a fresh upload intent.' }],
        });
      }
    }

    const bytes = options.data instanceof Uint8Array ? options.data : new Uint8Array(options.data);
    if (bytes.byteLength < 1 || bytes.byteLength > MAX_DOCUMENT_UPLOAD_BYTES) {
      throw new DIPValidationError(
        `File size must be between 1 byte and ${MAX_DOCUMENT_UPLOAD_BYTES} bytes.`,
        { details: [{ field: 'data', reason: `Received ${bytes.byteLength} bytes.` }] }
      );
    }

    if (options.signal?.aborted) {
      throw new DIPAbortError();
    }

    options.onProgress?.({ loadedBytes: 0, totalBytes: bytes.byteLength, percent: 0 });

    const fetchFn = options.fetchImpl ?? globalThis.fetch;
    if (typeof fetchFn !== 'function') {
      throw new DIPNetworkError('Fetch API unavailable for signed URL upload.');
    }

    try {
      const response = await fetchFn(parsedUrl.toString(), {
        method: 'PUT',
        headers: {
          'Content-Type': mimeCheck.data,
          'Content-Length': String(bytes.byteLength),
        },
        body: bytes as BodyInit,
        signal: options.signal,
        redirect: 'manual',
      });

      if (!response.ok) {
        throw new DIPNetworkError(`Signed upload failed with HTTP status ${response.status}`, {
          status: response.status,
        });
      }

      options.onProgress?.({
        loadedBytes: bytes.byteLength,
        totalBytes: bytes.byteLength,
        percent: 100,
      });

      return {
        status: response.status,
        etag: response.headers.get('etag') ?? undefined,
      };
    } catch (error) {
      if (error instanceof DIPValidationError || error instanceof DIPNetworkError || error instanceof DIPAbortError) {
        throw error;
      }
      if (options.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
        throw new DIPAbortError('Document upload was cancelled.', { cause: error });
      }
      throw new DIPNetworkError('Failed to upload document to signed URL.', { cause: error });
    }
  }
}
