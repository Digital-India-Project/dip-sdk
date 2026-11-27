import { DIPAbortError, DIPNetworkError, DIPTimeoutError } from './errors.js';

export interface TransportRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string | Uint8Array;
  timeoutMs: number;
  signal?: AbortSignal;
}

export interface TransportResponse {
  status: number;
  headers: Record<string, string>;
  text: string;
}

export interface TransportAdapter {
  send(request: TransportRequest): Promise<TransportResponse>;
}

export class FetchTransport implements TransportAdapter {
  private readonly fetchImpl: typeof fetch;

  constructor(fetchImpl?: typeof fetch) {
    const resolved = fetchImpl ?? globalThis.fetch;
    if (typeof resolved !== 'function') {
      throw new Error('Fetch API is not available in this runtime. Provide a custom TransportAdapter.');
    }
    this.fetchImpl = resolved.bind(globalThis);
  }

  public async send(request: TransportRequest): Promise<TransportResponse> {
    const controller = new AbortController();
    let timedOut = false;

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, request.timeoutMs);

    const onCallerAbort = () => {
      controller.abort();
    };

    if (request.signal) {
      if (request.signal.aborted) {
        clearTimeout(timeoutHandle);
        throw new DIPAbortError();
      }
      request.signal.addEventListener('abort', onCallerAbort, { once: true });
    }

    try {
      const response = await this.fetchImpl(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body as BodyInit | undefined,
        signal: controller.signal,
        // Never silently follow redirects so Bearer tokens cannot leak cross-origin
        redirect: 'manual',
      });

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      const text = await response.text();
      return {
        status: response.status,
        headers,
        text,
      };
    } catch (error) {
      if (timedOut) {
        throw new DIPTimeoutError(
          `Request timed out after ${request.timeoutMs}ms`,
          { cause: error }
        );
      }
      if (request.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
        throw new DIPAbortError('Request was cancelled by caller.', { cause: error });
      }
      throw new DIPNetworkError(
        error instanceof Error ? error.message : 'Network transport error',
        { cause: error }
      );
    } finally {
      clearTimeout(timeoutHandle);
      request.signal?.removeEventListener('abort', onCallerAbort);
    }
  }
}
