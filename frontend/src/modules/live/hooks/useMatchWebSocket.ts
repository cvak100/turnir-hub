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
  score: { home: number | null; away: number | null };
  status: string | null;
  event: {
    id: number;
    event_type: string;
    minute: number;
    extra_minute: number | null;
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
  const [attempt, setAttempt] = useState(0);
  const onMessageRef = useRef(onMessage);
  const onReconnectRef = useRef(onReconnect);
  const intentionalClose = useRef(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

  const reconnect = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !Number.isFinite(matchId)) {
      setStatus("disconnected");
      return;
    }

    intentionalClose.current = false;
    setStatus("connecting");

    const url = `${env.wsUrl.replace(/\/$/, "")}/matches/${matchId}/`;
    const socket = new WebSocket(url);
    let reconnectTimer: number | undefined;

    socket.onopen = () => {
      setStatus("connected");
      if (attempt > 0) {
        onReconnectRef.current?.();
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type?: string;
        };
        if (data.type === "match.update") {
          onMessageRef.current(data as MatchUpdateMessage);
        }
      } catch {
        // ignore malformed payloads
      }
    };

    socket.onerror = () => {
      setStatus("error");
    };

    socket.onclose = () => {
      if (intentionalClose.current) {
        setStatus("disconnected");
        return;
      }
      setStatus("disconnected");
      const delay = Math.min(1000 * 2 ** Math.min(attempt, 5), 15000);
      reconnectTimer = window.setTimeout(() => {
        setAttempt((value) => value + 1);
      }, delay);
    };

    return () => {
      intentionalClose.current = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket.close();
    };
  }, [matchId, enabled, attempt]);

  return { status, reconnect };
}
