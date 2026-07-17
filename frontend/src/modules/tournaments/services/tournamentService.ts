import type { PaginatedResponse, QueryParams } from "@/shared/api";
import { api } from "@/shared/api";
import type { PersonMinimal, SportRef } from "@/shared/types";

export interface TournamentListItem {
  id: number;
  name: string;
  sport: SportRef;
  logo: string | null;
  is_active: boolean;
}

export interface TournamentDetail extends TournamentListItem {
  description: string;
  contact_person: PersonMinimal | null;
  created_at: string;
  updated_at: string;
}

export type TournamentInput = {
  name: string;
  sport: number;
  description?: string;
  is_active?: boolean;
  contact_person?: number | null;
};

export const tournamentService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<TournamentListItem>>("/tournaments/", {
      params,
      auth: false,
    });
  },

  get(id: number) {
    return api.get<TournamentDetail>(`/tournaments/${id}/`, { auth: false });
  },

  create(data: TournamentInput) {
    return api.post<TournamentDetail>("/tournaments/", data);
  },

  update(id: number, data: Partial<TournamentInput>) {
    return api.patch<TournamentDetail>(`/tournaments/${id}/`, data);
  },
};
