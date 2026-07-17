import type { PaginatedResponse, QueryParams } from "@/shared/api";
import { api } from "@/shared/api";
import type { PersonMinimal, StatusRef } from "@/shared/types";

export interface TeamListItem {
  id: number;
  name: string;
  short_name: string;
  city: string;
  logo: string | null;
  status: StatusRef;
}

export interface TeamDetail extends TeamListItem {
  founded_year: number | null;
  shirt_top: string;
  shirt_bottom: string;
  social_links: unknown;
  contact_person: PersonMinimal | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type TeamInput = {
  name: string;
  short_name?: string;
  city?: string;
  status: number;
  founded_year?: number | null;
  notes?: string;
};

export interface TeamParticipationListItem {
  id: number;
  participation_name: string;
  team: TeamListItem;
  tournament_edition: { id: number; name: string; year: number };
  status: StatusRef;
  payment_status: boolean;
  registered_at: string;
}

export type TeamParticipationInput = {
  team: number;
  tournament_edition: number;
  participation_name?: string;
  payment_status?: boolean;
  status?: number;
  notes?: string;
};

export const teamService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<TeamListItem>>("/teams/", { params });
  },

  get(id: number) {
    return api.get<TeamDetail>(`/teams/${id}/`);
  },

  create(data: TeamInput) {
    return api.post<TeamDetail>("/teams/", data);
  },

  update(id: number, data: Partial<TeamInput>) {
    return api.patch<TeamDetail>(`/teams/${id}/`, data);
  },
};

export const teamParticipationService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<TeamParticipationListItem>>(
      "/team-participations/",
      { params },
    );
  },

  create(data: TeamParticipationInput) {
    return api.post<TeamParticipationListItem>("/team-participations/", data);
  },
};
