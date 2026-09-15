/** Django listen port on this PC (localhost only — not forwarded on router). */

export const DEV_BACKEND_PORT = 61106;



/**

 * Browser always uses the same host/port as the page (3000).

 * Vite proxies /api and /ws → Django on localhost:DEV_BACKEND_PORT.

 * Router: forward only TCP 3000. Never expose 5432 (DB) or 61106.

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

