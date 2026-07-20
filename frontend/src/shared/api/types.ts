export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface BackendErrorBody {
  success?: false;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    request_id?: string | null;
  };
}

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;
