import { NextRequest } from 'next/server';
import { TimeoutError } from '../../middleware/error-handling';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export interface BackendRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export class BackendConnectionError extends Error {
  public code = 'BACKEND_CONNECTION_ERROR';
  public statusCode = 503;
  public backendUrl: string;

  constructor(message: string, backendUrl: string, cause?: Error) {
    super(message);
    this.name = 'BackendConnectionError';
    this.backendUrl = backendUrl;
    if (cause) {
      this.cause = cause;
    }
  }
}

function isConnectionError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code ? String(error.code).toLowerCase() : '';
  const cause = (error as any).cause;
  const causeCode = cause?.code ? String(cause.code).toLowerCase() : '';
  const causeMessage = cause?.message?.toLowerCase() || '';

  return (
    errorCode === 'econnrefused' ||
    causeCode === 'econnrefused' ||
    errorMessage.includes('connection refused') ||
    errorMessage.includes('econnrefused') ||
    causeMessage.includes('connection refused') ||
    causeMessage.includes('econnrefused') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('network error') ||
    errorCode === 'enotfound' ||
    causeCode === 'enotfound'
  );
}

function safeStringify(obj: any): string {
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    });
  } catch (e) {
    console.error('JSON stringify error:', e);
    throw new Error('Failed to serialize request body');
  }
}

export async function makeBackendRequest(
  endpoint: string,
  options: BackendRequestOptions = {},
  request?: NextRequest
): Promise<Response> {
  const { method = 'GET', headers = {}, body, timeout = 30000 } = options;

  if (request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    let requestBody: string | undefined;
    if (body) {
      if (typeof body === 'string') {
        requestBody = body;
      } else {
        requestBody = safeStringify(body);
      }
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: requestBody,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error?.name === 'AbortError' || error?.code === 20) {
      throw new TimeoutError(
        `Request to ${endpoint} timed out after ${timeout}ms`,
        timeout
      );
    }

    if (isConnectionError(error)) {
      const fullUrl = `${BACKEND_URL}${endpoint}`;
      const errorMessage = `Backend service is not available at ${BACKEND_URL}. Please ensure the backend server is running.`;
      throw new BackendConnectionError(errorMessage, BACKEND_URL, error);
    }

    throw error;
  }
}

export async function makeBackendFormRequest(
  endpoint: string,
  formData: FormData,
  options: Omit<BackendRequestOptions, 'body'> = {},
  request?: NextRequest
): Promise<Response> {
  const { method = 'POST', headers = {}, timeout = 300000 } = options;

  if (request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method,
      headers,
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error?.name === 'AbortError' || error?.code === 20) {
      throw new TimeoutError(
        `Request to ${endpoint} timed out after ${timeout}ms`,
        timeout
      );
    }

    if (isConnectionError(error)) {
      const errorMessage = `Backend service is not available at ${BACKEND_URL}. Please ensure the backend server is running.`;
      throw new BackendConnectionError(errorMessage, BACKEND_URL, error);
    }

    throw error;
  }
}

export function getBackendUrl(): string {
  return BACKEND_URL;
}
