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
  location?: string;
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

  finishPreview(editionId: number) {
    return api.get<EditionFinishPreview>(`/editions/${editionId}/finish-preview/`);
  },

  finish(editionId: number, data: EditionFinishInput) {
    return api.post<EditionDetail>(`/editions/${editionId}/finish/`, data);
  },

  saveStandings(
    editionId: number,
    standings: NonNullable<EditionFinishInput["standings"]>,
  ) {
    return api.post<{ ok: boolean; count: number }>(
      `/editions/${editionId}/save-standings/`,
      { standings },
    );
  },

  saveAwards(
    editionId: number,
    award_entries: NonNullable<EditionFinishInput["award_entries"]>,
  ) {
    return api.post<{ ok: boolean; count: number }>(
      `/editions/${editionId}/save-awards/`,
      { award_entries },
    );
  },

  createAward(data: { name: string; code?: string; description?: string }) {
    return api.post<FinishAwardCatalogItem>("/awards/", data);
  },
};

export type FinishStandingRow = {
  id?: number;
  team_participation_id: number;
  team_name?: string;
  position: number;
  matches_played?: number | null;
  wins?: number | null;
  draws?: number | null;
  losses?: number | null;
  points?: number | null;
  goals_for?: number | null;
  goals_against?: number | null;
  goal_difference?: number | null;
  qualification?: string;
  notes?: string;
};

export type FinishAwardCatalogItem = {
  id: number;
  name: string;
  code: string;
  description: string;
  order: number;
  is_active: boolean;
};

export type FinishGroupStandingTable = {
  group_id: number;
  group_name: string;
  phase_id: number;
  phase_name: string;
  rows: Array<{
    position: number;
    team_participation_id: number;
    team_name: string;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    points: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
  }>;
};

export type FinishKnockoutMatch = {
  id: number;
  match_number: number | null;
  phase_id: number | null;
  phase_name: string | null;
  phase_type: string | null;
  round_code?: string | null;
  status_code: string | null;
  status_name: string | null;
  home: string;
  away: string;
  score: string | null;
  link: string;
};

export type FinishAwardEntry = {
  player_award_id?: number;
  award_id: number;
  award_name?: string;
  player_id: number;
  player_name?: string;
  team_participation_id?: number | null;
  notes?: string;
  prize?: {
    id?: number;
    prize_type: string;
    recipient_type: string;
    value?: string | null;
    description?: string;
    notes?: string;
    sponsor_id?: number | null;
    sponsor_name?: string | null;
  } | null;
};

export type EditionFinishPreview = {
  edition_id: number;
  edition_name: string;
  status: { id: number; code: string | null; name: string | null };
  can_finish: boolean;
  ranking_criteria: string[];
  unfinished_matches: Array<{
    id: number;
    match_number: number | null;
    phase_id: number | null;
    phase_name: string | null;
    status_code: string | null;
    status_name: string | null;
    home: string | null;
    away: string | null;
    link: string;
  }>;
  structure: {
    groups: Array<{
      id: number;
      name: string;
      phase_id: number;
      phase_name: string;
    }>;
    knockout_phases: Array<{
      id: number;
      name: string;
      phase_type: string;
      round_code?: string | null;
    }>;
  };
  group_standings: FinishGroupStandingTable[];
  knockout_matches: FinishKnockoutMatch[];
  proposed_standings: FinishStandingRow[];
  award_entries: FinishAwardEntry[];
  awards_catalog: FinishAwardCatalogItem[];
  ranking_criteria_catalog: Array<{ code: string; label: string }>;
  edition_teams: Array<{ id: number; name: string }>;
  sponsors: Array<{ id: number; name: string }>;
};

export type EditionFinishInput = {
  standings?: Array<{
    team_participation_id: number;
    position: number;
    qualification?: string;
    notes?: string;
  }>;
  award_entries?: Array<{
    award_id?: number | null;
    new_award_name?: string;
    player_id: number;
    team_participation_id?: number | null;
    notes?: string;
    prize?: {
      prize_type: string;
      recipient_type?: string;
      value?: string | null;
      description?: string;
      notes?: string;
      sponsor_id?: number | null;
    } | null;
  }>;
  new_awards?: Array<{
    name: string;
    code?: string;
    description?: string;
  }>;
};
