import { env } from "@/env";
import { ApiError } from "./errors";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./tokens";
import type { QueryParams } from "./types";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type RequestOptions = {
  params?: QueryParams;
  body?: unknown;
  auth?: boolean;
  retry?: boolean;
  signal?: AbortSignal;
};

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

function buildUrl(path: string, params?: QueryParams): string {
  const normalized = path.startsWith("http")
    ? path
    : `${env.apiUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const url = new URL(normalized);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    const response = await fetch(buildUrl("/auth/token/refresh/"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh }),
    });
    const body = await parseBody(response);
    if (!response.ok) return false;

    const access =
      typeof body === "object" && body !== null && "access" in body
        ? String((body as { access: string }).access)
        : null;
    if (!access) return false;

    setTokens(access);
    return true;
  } catch {
    return false;
  }
}

function handleAuthFailure(): void {
  clearTokens();
  if (onUnauthorized) {
    onUnauthorized();
  } else if (typeof window !== "undefined") {
    window.location.assign("/login");
  }
}

async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, body, auth = true, retry = true, signal } = options;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const access = getAccessToken();
    if (access) {
      headers.Authorization = `Bearer ${access}`;
    }
  }

  const response = await fetch(buildUrl(path, params), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (response.status === 401 && auth && retry) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      return request<T>(method, path, { ...options, retry: false });
    }
    handleAuthFailure();
    throw new ApiError({
      status: 401,
      code: "unauthorized",
      message: "Session expired. Please log in again.",
    });
  }

  const parsed = await parseBody(response);
  if (!response.ok) {
    throw ApiError.fromResponse(response.status, parsed);
  }

  return parsed as T;
}

export const api = {
  get<T>(path: string, options?: Omit<RequestOptions, "body">): Promise<T> {
    return request<T>("GET", path, options);
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("POST", path, { ...options, body });
  },
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("PATCH", path, { ...options, body });
  },
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>("PUT", path, { ...options, body });
  },
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("DELETE", path, options);
  },
};
