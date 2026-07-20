import { api } from "@/shared/api";
import type { PaginatedResponse, QueryParams } from "@/shared/api/types";
import type { PersonMinimal, SportRef, StatusRef } from "@/shared/types";

export type TournamentStatus = StatusRef;
export type Sport = SportRef;

export type TournamentListItem = {
  id: number;
  name: string;
  sport: Sport;
  logo: string | null;
  is_active: boolean;
};

export type TournamentDetail = TournamentListItem & {
  description: string;
  contact_person: PersonMinimal | null;
  created_at: string;
  updated_at: string;
};

export type TournamentInput = {
  name: string;
  sport: number;
  description?: string;
  is_active?: boolean;
  contact_person?: number | null;
};

export type EditionListItem = {
  id: number;
  name: string;
  year: number;
  tournament: number;
  tournament_name: string;
  status: TournamentStatus | null;
  format: TournamentFormat | null;
  category: TournamentCategory | null;
  start_date: string;
  end_date: string;
  is_public: boolean;
};

export type TournamentFormat = {
  id: number;
  name: string;
  code: string;
  description: string;
  default_phases: Array<{
    name: string;
    phase_type: string;
    order: number;
    config?: Record<string, unknown>;
  }>;
  order: number;
};

export type TournamentCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  order: number;
};

export type GlobalRuleTemplate = {
  id: number;
  name: string;
  description: string;
  match_duration_minutes: number | null;
  half_time_duration_minutes: number | null;
  number_of_halves: number;
  players_per_team: number | null;
  max_players_on_roster: number | null;
  unlimited_substitutions: boolean;
  max_substitutions: number | null;
  field_type: string;
  ball_size: number | null;
  allow_extra_time: boolean;
  extra_time_minutes: number | null;
  allow_penalties: boolean;
  offside_rule: boolean;
  max_team_fouls: number | null;
  yellow_card_rules: string;
  red_card_rules: string;
  points_for_win: number;
  points_for_draw: number;
  full_rules_text: string;
  notes: string;
  is_system?: boolean;
};

export type GlobalRuleTemplateInput = {
  name: string;
  description?: string;
  full_rules_text?: string;
  notes?: string;
  match_duration_minutes?: number | null;
  half_time_duration_minutes?: number | null;
  number_of_halves?: number;
  players_per_team?: number | null;
  max_players_on_roster?: number | null;
  unlimited_substitutions?: boolean;
  max_substitutions?: number | null;
  field_type?: string;
  ball_size?: number | null;
  allow_extra_time?: boolean;
  extra_time_minutes?: number | null;
  allow_penalties?: boolean;
  offside_rule?: boolean;
  max_team_fouls?: number | null;
  yellow_card_rules?: string;
  red_card_rules?: string;
  points_for_win?: number;
  points_for_draw?: number;
};

export function sortRuleTemplates(
  templates: GlobalRuleTemplate[],
): GlobalRuleTemplate[] {
  return templates.slice().sort((a, b) => {
    if (Boolean(a.is_system) !== Boolean(b.is_system)) {
      return a.is_system ? -1 : 1;
    }
    return a.name.localeCompare(b.name, "sl");
  });
}

export type EditionDetail = Omit<EditionListItem, "tournament"> & {
  tournament: TournamentListItem;
  registration_start: string | null;
  registration_end: string | null;
  category: TournamentCategory | null;
  max_teams: number | null;
  max_players_per_team: number | null;
  public_rules: string;
  configuration?: Record<string, unknown> | null;
  global_rule_template: GlobalRuleTemplate | null;
  location: string;
  contact_person: PersonMinimal | null;
  entry_fee: string | null;
  created_at: string;
  updated_at: string;
};

export type EditionInput = {
  tournament: number;
  name: string;
  year: number;
  start_date: string;
  end_date: string;
  status: number;
  format?: number | null;
  category?: number | null;
  location?: string;
  is_public?: boolean;
  max_teams?: number | null;
  max_players_per_team?: number | null;
  registration_start?: string | null;
  registration_end?: string | null;
  contact_person?: number | null;
  entry_fee?: string | null;
  public_rules?: string;
  configuration?: Record<string, unknown> | null;
  global_rule_template?: number | null;
  apply_format_phases?: boolean;
  replace_format_phases?: boolean;
};

export const adminTournamentService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<TournamentListItem>>("/tournaments/", {
      params,
    });
  },

  get(id: number) {
    return api.get<TournamentDetail>(`/tournaments/${id}/`);
  },

  create(data: TournamentInput) {
    return api.post<TournamentDetail>("/tournaments/", data);
  },

  update(id: number, data: Partial<TournamentInput>) {
    return api.patch<TournamentDetail>(`/tournaments/${id}/`, data);
  },

  delete(id: number) {
    return api.delete<TournamentDetail | void>(`/tournaments/${id}/`);
  },

  listSports() {
    return api.get<Sport[]>("/sports/");
  },

  listStatuses() {
    return api.get<TournamentStatus[]>("/tournament-statuses/");
  },

  listRuleTemplates() {
    return api.get<GlobalRuleTemplate[]>("/global-rule-templates/");
  },

  createRuleTemplate(data: GlobalRuleTemplateInput) {
    return api.post<GlobalRuleTemplate>("/global-rule-templates/", data);
  },

  deleteRuleTemplate(id: number) {
    return api.delete<void>(`/global-rule-templates/${id}/`);
  },

  listFormats() {
    return api.get<TournamentFormat[]>("/tournament-formats/");
  },

  listCategories() {
    return api.get<TournamentCategory[]>("/tournament-categories/");
  },
};

export const adminEditionService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<EditionListItem>>("/editions/", { params });
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
};
