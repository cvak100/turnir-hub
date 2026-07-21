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
  is_active: boolean;
  config: Record<string, unknown> | null;
}

export interface PhaseDetail extends PhaseListItem {
  created_at: string;
  updated_at: string;
}

export type PhaseInput = {
  tournament_edition: number;
  name: string;
  phase_type: string;
  order: number;
  status?: string;
  is_active?: boolean;
  config?: Record<string, unknown> | null;
};

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
  phase_name?: string;
  phase_type?: string;
  group_name?: string | null;
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
  team_name?: string | null;
  home_team_name?: string | null;
  away_team_name?: string | null;
  tournament_edition_id?: number;
  player: number | null;
  player_name?: string | null;
  is_temporary_player: boolean;
  temporary_player_label: string;
  is_penalty: boolean;
  is_own_goal: boolean;
  created_at?: string;
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
  goal_type?: string;
  body_part?: string;
  is_penalty?: boolean;
  is_own_goal?: boolean;
  is_var_decision?: boolean;
  var_result?: string;
  description?: string;
  score_home_at_event?: number | null;
  score_away_at_event?: number | null;
  is_temporary_player?: boolean;
  temporary_player_label?: string;
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

  create(data: PhaseInput) {
    return api.post<PhaseDetail>("/phases/", data);
  },

  update(id: number, data: Partial<PhaseInput>) {
    return api.patch<PhaseDetail>(`/phases/${id}/`, data);
  },

  delete(id: number) {
    return api.delete<void>(`/phases/${id}/`);
  },

  generateGroups(
    id: number,
    data: {
      number_of_groups: number;
      max_teams?: number | null;
      replace?: boolean;
    },
  ) {
    return api.post<GroupListItem[]>(`/phases/${id}/generate-groups/`, data);
  },

  generateMatches(
    id: number,
    data?: { replace?: boolean; match_count?: number },
  ) {
    return api.post<MatchListItem[]>(`/phases/${id}/generate-matches/`, data ?? {});
  },
};

export type GroupTeamItem = {
  id: number;
  tournament_phase_group: number;
  team_participation: number;
  participation_name: string;
  order: number | null;
};

export const groupService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<GroupListItem>>("/groups/", {
      params,
    });
  },

  create(data: {
    tournament_phase: number;
    name: string;
    order: number;
    max_teams?: number | null;
  }) {
    return api.post<GroupListItem>("/groups/", data);
  },

  update(
    id: number,
    data: Partial<{
      name: string;
      order: number;
      max_teams: number | null;
    }>,
  ) {
    return api.patch<GroupListItem>(`/groups/${id}/`, data);
  },

  delete(id: number) {
    return api.delete<void>(`/groups/${id}/`);
  },
};

export const groupTeamService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<GroupTeamItem>>("/group-teams/", {
      params,
    });
  },

  create(data: {
    tournament_phase_group: number;
    team_participation: number;
    order?: number | null;
  }) {
    return api.post<GroupTeamItem>("/group-teams/", data);
  },

  delete(id: number) {
    return api.delete<void>(`/group-teams/${id}/`);
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

  create(data: {
    tournament_phase: number;
    tournament_phase_group?: number | null;
    match_number?: number | null;
    home_team_participation?: number | null;
    away_team_participation?: number | null;
    status?: number;
  }) {
    return api.post<MatchDetail>("/matches/", data);
  },

  update(
    id: number,
    data: Partial<{
      tournament_phase: number;
      tournament_phase_group: number | null;
      home_team_participation: number | null;
      away_team_participation: number | null;
      match_number: number | null;
      match_date: string | null;
      status: number;
      home_score: number | null;
      away_score: number | null;
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
      referee: number | null;
      notes: string;
    }>,
  ) {
    return api.patch<MatchDetail>(`/matches/${id}/`, data);
  },

  delete(id: number) {
    return api.delete<void>(`/matches/${id}/`);
  },

  start(id: number) {
    return api.post<MatchDetail>(`/matches/${id}/start/`);
  },

  reopen(id: number) {
    return api.post<MatchDetail>(`/matches/${id}/reopen/`);
  },

  finish(id: number) {
    return api.post<MatchDetail>(`/matches/${id}/finish/`);
  },

  recalculate(id: number) {
    return api.post<MatchDetail>(`/matches/${id}/recalculate/`);
  },

  setStatus(id: number, statusCode: string) {
    return api.post<MatchDetail>(`/matches/${id}/set-status/`, {
      status_code: statusCode,
    });
  },

  setPenalties(id: number, enabled = true) {
    return api.post<MatchDetail>(`/matches/${id}/set-penalties/`, { enabled });
  },
};

export type MatchStatusItem = {
  id: number;
  name: string;
  code: string;
  color: string;
};

export const matchStatusService = {
  list() {
    return api.get<MatchStatusItem[]>("/match-statuses/", { auth: false });
  },
};

export const eventTypeService = {
  list() {
    return api.get<EventTypeRef[]>("/event-types/", { auth: false });
  },
};

export const matchEventService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<MatchEventListItem>>("/match-events/", {
      params,
      auth: false,
    });
  },

  get(id: number) {
    return api.get<MatchEventDetail>(`/match-events/${id}/`);
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

  delete(id: number) {
    return api.delete<void>(`/match-events/${id}/`);
  },
};
