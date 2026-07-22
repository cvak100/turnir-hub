import { useCallback, useEffect, useRef, useState } from "react";
import { env } from "@/env";

export type WsConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type MatchUpdateMessage = {
  type: "match.update";
  match_id: number;
  score: {
    home: number | null;
    away: number | null;
    home_penalties?: number | null;
    away_penalties?: number | null;
  };
  status: string | null;
  is_penalties?: boolean;
  event: {
    id: number;
    event_type: string;
    minute: number;
    extra_minute: number | null;
    half?: string;
    team_participation_id: number;
    player_id: number | null;
    is_temporary_player: boolean;
    temporary_player_label: string;
    related_player_id: number | null;
  } | null;
};

type Options = {
  matchId: number;
  enabled?: boolean;
  onMessage: (message: MatchUpdateMessage) => void;
  onReconnect?: () => void;
};

export function useMatchWebSocket({
  matchId,
  enabled = true,
  onMessage,
  onReconnect,
}: Options) {
  const [status, setStatus] = useState<WsConnectionStatus>("disconnected");
  const onMessageRef = useRef(onMessage);
  const onReconnectRef = useRef(onReconnect);
  const intentionalClose = useRef(false);
  const attemptRef = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

  useEffect(() => {
    if (!enabled || !Number.isFinite(matchId)) {
      setStatus("disconnected");
      return;
    }

    intentionalClose.current = false;
    let reconnectTimer: number | undefined;
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      setStatus("connecting");
      const url = `${env.wsUrl.replace(/\/$/, "")}/matches/${matchId}/`;
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        if (cancelled) return;
        setStatus("connected");
        if (attemptRef.current > 0) {
          onReconnectRef.current?.();
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as { type?: string };
          if (data.type === "match.update") {
            onMessageRef.current(data as MatchUpdateMessage);
          }
        } catch {
          // ignore malformed payloads
        }
      };

      socket.onerror = () => {
        // onclose will handle reconnect; avoid flicker via error state
      };

      socket.onclose = () => {
        if (cancelled || intentionalClose.current) {
          setStatus("disconnected");
          return;
        }
        // Stay on "connecting" while waiting to retry — less flicker
        setStatus("connecting");
        const delay = Math.min(1000 * 2 ** Math.min(attemptRef.current, 5), 15000);
        attemptRef.current += 1;
        reconnectTimer = window.setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      cancelled = true;
      intentionalClose.current = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [matchId, enabled]);

  const reconnect = useCallback(() => {
    intentionalClose.current = true;
    socketRef.current?.close();
    intentionalClose.current = false;
    attemptRef.current += 1;
    // effect won't re-run; force by toggling is awkward — parent remounts rarely
  }, []);

  return { status, reconnect };
}
