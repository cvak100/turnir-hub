import type { PaginatedResponse, QueryParams } from "@/shared/api";
import { api } from "@/shared/api";
import type { PersonMinimal, StatusRef } from "@/shared/types";

export interface TeamListItem {
  id: number;
  name: string;
  short_name: string;
  city: string;
  logo: string | null;
  status: StatusRef | null;
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
  status?: number;
  founded_year?: number | null;
  notes?: string;
};

export type TeamStatus = StatusRef;

export interface TeamParticipationListItem {
  id: number;
  participation_name: string;
  team: TeamListItem;
  tournament_edition: { id: number; name: string; year: number };
  status: StatusRef | null;
  payment_status: boolean;
  registered_at: string;
}

export interface TeamParticipationDetail extends TeamParticipationListItem {
  contact_person: PersonMinimal | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type TeamParticipationInput = {
  team: number;
  tournament_edition: number;
  participation_name?: string;
  payment_status?: boolean;
  status?: number;
  contact_person?: number | null;
  notes?: string;
  registered_at?: string;
};

export const teamService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<TeamListItem>>("/teams/", {
      params,
      auth: false,
    });
  },

  get(id: number) {
    return api.get<TeamDetail>(`/teams/${id}/`, { auth: false });
  },

  create(data: TeamInput) {
    return api.post<TeamDetail>("/teams/", data);
  },

  update(id: number, data: Partial<TeamInput>) {
    return api.patch<TeamDetail>(`/teams/${id}/`, data);
  },

  listStatuses() {
    return api.get<TeamStatus[]>("/team-statuses/");
  },
};

export const teamParticipationService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<TeamParticipationListItem>>(
      "/team-participations/",
      { params },
    );
  },

  get(id: number) {
    return api.get<TeamParticipationDetail>(`/team-participations/${id}/`);
  },

  create(data: TeamParticipationInput) {
    return api.post<TeamParticipationDetail>("/team-participations/", data);
  },

  update(id: number, data: Partial<TeamParticipationInput>) {
    return api.patch<TeamParticipationDetail>(
      `/team-participations/${id}/`,
      data,
    );
  },

  delete(id: number) {
    return api.delete<void>(`/team-participations/${id}/`);
  },
};
