/**
 * Browser uses the same host/port as the page (:3000).
 * Vite proxies /api and /ws → Django on 127.0.0.1:8000.
 */

function browserApiUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return "/api/v1";
}

function browserWsUrl(): string {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  if (typeof window === "undefined") {
    return "ws://127.0.0.1:3000/ws";
  }
  const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${window.location.host}/ws`;
}

export const env = {
  apiUrl: browserApiUrl(),
  wsUrl: browserWsUrl(),
};
