import type { BackendErrorBody } from "./types";

export class ApiError extends Error {
  readonly code: string;
  readonly details: unknown;
  readonly requestId: string | null;
  readonly status: number;

  constructor(options: {
    message: string;
    code?: string;
    details?: unknown;
    requestId?: string | null;
    status?: number;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.code = options.code ?? "unknown_error";
    this.details = options.details ?? null;
    this.requestId = options.requestId ?? null;
    this.status = options.status ?? 0;
  }

  static fromResponse(status: number, body: unknown): ApiError {
    const parsed = body as BackendErrorBody | null;
    const error = parsed?.error;
    if (error && typeof error === "object") {
      return new ApiError({
        status,
        message: error.message ?? `Request failed (${status})`,
        code: error.code ?? "http_error",
        details: error.details ?? null,
        requestId: error.request_id ?? null,
      });
    }

    if (typeof body === "object" && body !== null) {
      const record = body as Record<string, unknown>;
      if (typeof record.detail === "string") {
        return new ApiError({
          status,
          message: record.detail,
          code: "http_error",
        });
      }
    }

    return new ApiError({
      status,
      message: `Request failed (${status})`,
      code: "http_error",
    });
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}
