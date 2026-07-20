import type { MatchEventListItem } from "@/modules/matches/services/matchService";
import type { MatchUpdateMessage } from "../hooks/useMatchWebSocket";

export function upsertEventFromWs(
  events: MatchEventListItem[],
  message: MatchUpdateMessage,
): MatchEventListItem[] {
  if (!message.event) return events;

  const incoming = message.event;
  const mapped: MatchEventListItem = {
    id: incoming.id,
    match: message.match_id,
    event_type: {
      id: 0,
      name: incoming.event_type,
      code: incoming.event_type,
      icon: "",
      color: "",
    },
    minute: incoming.minute,
    extra_minute: incoming.extra_minute,
    half: "",
    team_participation: incoming.team_participation_id,
    player: incoming.player_id,
    is_temporary_player: incoming.is_temporary_player,
    temporary_player_label: incoming.temporary_player_label,
    is_penalty: false,
    is_own_goal: false,
  };

  const index = events.findIndex((item) => item.id === mapped.id);
  if (index === -1) return [...events, mapped].sort(compareEvents);
  const next = [...events];
  next[index] = { ...next[index], ...mapped };
  return next.sort(compareEvents);
}

function compareEvents(a: MatchEventListItem, b: MatchEventListItem): number {
  if (a.minute !== b.minute) return a.minute - b.minute;
  return a.id - b.id;
}
