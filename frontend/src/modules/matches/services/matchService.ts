import type { PaginatedResponse, QueryParams } from "@/shared/api";
import { api } from "@/shared/api";
import type { PersonMinimal, StatusRef } from "@/shared/types";

export interface PhaseListItem {
  id: number;
  tournament_edition: number;
  name: string;
  phase_type: string;
  order: number;
  status: string;
}

export interface PhaseDetail extends PhaseListItem {
  rules: unknown;
  created_at: string;
  updated_at: string;
}

export interface GroupListItem {
  id: number;
  tournament_phase: number;
  name: string;
  order: number;
  max_teams: number | null;
}

export interface MatchListItem {
  id: number;
  tournament_phase: number;
  tournament_phase_group: number | null;
  match_number: number | null;
  match_date: string | null;
  status: StatusRef;
  home_team_participation: number | null;
  away_team_participation: number | null;
  home_team_name: string | null;
  away_team_name: string | null;
  home_score: number | null;
  away_score: number | null;
}

export interface MatchDetail extends MatchListItem {
  halftime_home_score: number | null;
  halftime_away_score: number | null;
  extra_time_home_score: number | null;
  extra_time_away_score: number | null;
  home_score_penalties: number | null;
  away_score_penalties: number | null;
  is_extra_time: boolean;
  is_penalties: boolean;
  is_walkover: boolean;
  duration_minutes: number | null;
  attendance: number | null;
  referee: PersonMinimal | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface EventTypeRef {
  id: number;
  name: string;
  code: string;
  icon: string;
  color: string;
}

export interface MatchEventListItem {
  id: number;
  match: number;
  event_type: EventTypeRef;
  minute: number;
  extra_minute: number | null;
  half: string;
  team_participation: number;
  player: number | null;
  is_temporary_player: boolean;
  temporary_player_label: string;
  is_penalty: boolean;
  is_own_goal: boolean;
}

export interface MatchEventDetail extends MatchEventListItem {
  related_player: number | null;
  goal_type: string;
  body_part: string;
  is_var_decision: boolean;
  var_result: string;
  description: string;
  score_home_at_event: number | null;
  score_away_at_event: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export type MatchEventInput = {
  match: number;
  event_type: number;
  team_participation: number;
  minute: number;
  half?: string;
  extra_minute?: number | null;
  player?: number | null;
  related_player?: number | null;
  is_temporary_player?: boolean;
  temporary_player_label?: string;
  is_own_goal?: boolean;
  description?: string;
  notes?: string;
};

export const phaseService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<PhaseListItem>>("/phases/", {
      params,
    });
  },

  get(id: number) {
    return api.get<PhaseDetail>(`/phases/${id}/`);
  },
};

export const groupService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<GroupListItem>>("/groups/", {
      params,
    });
  },
};

export const matchService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<MatchListItem>>("/matches/", {
      params,
      auth: false,
    });
  },

  get(id: number) {
    return api.get<MatchDetail>(`/matches/${id}/`, { auth: false });
  },

  start(id: number) {
    return api.post<MatchDetail>(`/matches/${id}/start/`);
  },

  finish(id: number) {
    return api.post<MatchDetail>(`/matches/${id}/finish/`);
  },
};

export const matchEventService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<MatchEventListItem>>("/match-events/", {
      params,
      auth: false,
    });
  },

  create(data: MatchEventInput) {
    const { notes, ...rest } = data;
    const body = {
      ...rest,
      description: rest.description ?? notes ?? "",
      half: rest.half ?? "1",
    };
    return api.post<MatchEventDetail>("/match-events/", body);
  },

  update(id: number, data: Partial<MatchEventInput>) {
    const { notes, ...rest } = data;
    const body = {
      ...rest,
      ...(notes !== undefined ? { description: notes } : {}),
    };
    return api.patch<MatchEventDetail>(`/match-events/${id}/`, body);
  },
};
