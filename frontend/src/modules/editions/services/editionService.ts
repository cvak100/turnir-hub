import type { PaginatedResponse, QueryParams } from "@/shared/api";
import { api } from "@/shared/api";
import type { PersonMinimal, StatusRef } from "@/shared/types";
import type { TournamentListItem } from "@/modules/tournaments/services/tournamentService";

export interface EditionListItem {
  id: number;
  name: string;
  year: number;
  tournament: number;
  tournament_name: string;
  status: StatusRef;
  start_date: string;
  end_date: string;
  is_public: boolean;
}

export interface EditionDetail {
  id: number;
  tournament: TournamentListItem;
  name: string;
  year: number;
  start_date: string;
  end_date: string;
  registration_start: string | null;
  registration_end: string | null;
  category: string;
  max_teams: number | null;
  max_players_per_team: number | null;
  status: StatusRef;
  public_rules: string;
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
  tournament: number;
  name: string;
  year: number;
  start_date: string;
  end_date: string;
  status: number;
  category?: string;
  max_teams?: number | null;
  max_players_per_team?: number | null;
  public_rules?: string;
  location?: string;
  is_public?: boolean;
  registration_start?: string | null;
  registration_end?: string | null;
  contact_person?: number | null;
  entry_fee?: string | null;
};

export const editionService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<EditionListItem>>("/editions/", {
      params,
      auth: false,
    });
  },

  get(id: number) {
    return api.get<EditionDetail>(`/editions/${id}/`, { auth: false });
  },

  update(id: number, data: Partial<EditionInput>) {
    return api.patch<EditionDetail>(`/editions/${id}/`, data);
  },
};
