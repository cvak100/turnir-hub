import type { PaginatedResponse, QueryParams } from "@/shared/api";
import { api } from "@/shared/api";
import type { PersonMinimal, StatusRef } from "@/shared/types";
import type { TournamentListItem } from "@/modules/tournaments/services/tournamentService";

export type TournamentCategoryRef = {
  id: number;
  name: string;
  slug: string;
  description: string;
  order: number;
};

export interface EditionListItem {
  id: number;
  name: string;
  year: number;
  tournament: number;
  tournament_name: string;
  status: StatusRef;
  format?: {
    id: number;
    name: string;
    code: string;
    description: string;
    default_phases: unknown[];
    order: number;
  } | null;
  category?: TournamentCategoryRef | null;
  start_date: string;
  end_date: string;
  is_public: boolean;
}

export type FormatConfig = {
  id: number;
  tournament_edition: number;
  number_of_groups: number;
  teams_per_group: number;
  teams_advancing_per_group: number;
  best_runners_up: boolean;
  number_of_best_runners_up: number | null;
  ranking_criteria: string[];
  half_duration_minutes: number | null;
  half_time_break_minutes: number | null;
  buffer_between_matches_minutes: number | null;
  has_third_place_match: boolean;
  pairing_method: "auto_cross" | "manual";
  knockout_home_advantage: boolean;
  expected_advancing_teams: number;
  created_at: string;
  updated_at: string;
};

export type FormatConfigInput = Partial<{
  number_of_groups: number;
  teams_per_group: number;
  teams_advancing_per_group: number;
  best_runners_up: boolean;
  number_of_best_runners_up: number | null;
  ranking_criteria: string[];
  half_duration_minutes: number | null;
  half_time_break_minutes: number | null;
  buffer_between_matches_minutes: number | null;
  has_third_place_match: boolean;
  pairing_method: "auto_cross" | "manual";
  knockout_home_advantage: boolean;
}>;

export interface EditionDetail {
  id: number;
  tournament: TournamentListItem;
  name: string;
  year: number;
  start_date: string;
  end_date: string;
  registration_start: string | null;
  registration_end: string | null;
  category: TournamentCategoryRef | null;
  max_teams: number | null;
  max_players_per_team: number | null;
  status: StatusRef;
  format?: EditionListItem["format"];
  public_rules: string;
  configuration?: Record<string, unknown> | null;
  format_config?: FormatConfig | null;
  global_rule_template?: {
    id: number;
    name: string;
    description?: string;
    full_rules_text?: string;
    players_per_team?: number | null;
    max_players_on_roster?: number | null;
    match_duration_minutes?: number | null;
    half_time_duration_minutes?: number | null;
    number_of_halves?: number | null;
    allow_extra_time?: boolean;
    extra_time_minutes?: number | null;
    allow_penalties?: boolean;
    offside_rule?: boolean;
  } | null;
  location: string;
  cover_image: string | null;
  contact_person: PersonMinimal | null;
  entry_fee: string | null;
  social_links: unknown;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export type EditionInput = {
  tournament?: number;
  name?: string;
  year?: number;
  start_date?: string;
  end_date?: string;
  status?: number;
  format?: number | null;
  category?: number | null;
  max_teams?: number | null;
  max_players_per_team?: number | null;
  public_rules?: string;
  configuration?: Record<string, unknown> | null;
  global_rule_template?: number | null;
  location?: string;
  is_public?: boolean;
  registration_start?: string | null;
  registration_end?: string | null;
  contact_person?: number | null;
  entry_fee?: string | null;
  apply_format_phases?: boolean;
  replace_format_phases?: boolean;
};

export const editionService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<EditionListItem>>("/editions/", {
      params,
    });
  },

  get(id: number) {
    return api.get<EditionDetail>(`/editions/${id}/`);
  },

  create(data: EditionInput) {
    return api.post<EditionDetail>("/editions/", data);
  },

  update(id: number, data: Partial<EditionInput>) {
    return api.patch<EditionDetail>(`/editions/${id}/`, data);
  },

  delete(id: number) {
    return api.delete<void>(`/editions/${id}/`);
  },

  getFormatConfig(editionId: number) {
    return api.get<FormatConfig>(`/editions/${editionId}/format-config/`);
  },

  updateFormatConfig(editionId: number, data: FormatConfigInput) {
    return api.patch<FormatConfig>(`/editions/${editionId}/format-config/`, data);
  },

  generateStructure(editionId: number, data?: { replace?: boolean }) {
    return api.post<unknown[]>(`/editions/${editionId}/generate-structure/`, data ?? {});
  },

  generateGroupMatches(editionId: number, data?: { replace?: boolean }) {
    return api.post<unknown[]>(
      `/editions/${editionId}/generate-group-matches/`,
      data ?? {},
    );
  },

  fillKnockout(
    editionId: number,
    data?: { replace?: boolean; force?: boolean },
  ) {
    return api.post<unknown[]>(`/editions/${editionId}/fill-knockout/`, data ?? {});
  },

  scheduleMatchTimes(
    editionId: number,
    data?: {
      start_time?: string;
      start_datetime?: string;
      match_ids?: number[];
      only_unscheduled?: boolean;
      overwrite?: boolean;
    },
  ) {
    return api.post<unknown[]>(
      `/editions/${editionId}/schedule-match-times/`,
      data ?? {},
    );
  },
};
