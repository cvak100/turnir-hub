import { api } from "@/shared/api";
import type { PaginatedResponse, QueryParams } from "@/shared/api/types";
import type { PersonMinimal, StatusRef } from "@/shared/types";

export type TeamStatus = StatusRef;

export type TeamListItem = {
  id: number;
  name: string;
  short_name: string;
  city: string;
  logo: string | null;
  status: TeamStatus | null;
};

export type TeamDetail = TeamListItem & {
  founded_year: number | null;
  shirt_top: string;
  shirt_bottom: string;
  social_links: unknown;
  contact_person: PersonMinimal | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type TeamInput = {
  name: string;
  short_name?: string;
  city?: string;
  status?: number | null;
  founded_year?: number | null;
  shirt_top?: string;
  shirt_bottom?: string;
  contact_person?: number | null;
  notes?: string;
};

export type TeamParticipationListItem = {
  id: number;
  participation_name: string;
  team: TeamListItem;
  tournament_edition: { id: number; name: string; year: number };
  status: TeamStatus | null;
  payment_status: boolean;
  registered_at: string;
};

export type TeamParticipationDetail = TeamParticipationListItem & {
  contact_person: PersonMinimal | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type TeamParticipationInput = {
  team: number;
  tournament_edition: number;
  participation_name?: string;
  contact_person?: number | null;
  payment_status?: boolean;
  status?: number;
  notes?: string;
};

export const adminTeamService = {
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

  delete(id: number) {
    return api.delete<void>(`/teams/${id}/`);
  },

  listStatuses() {
    return api.get<TeamStatus[]>("/team-statuses/");
  },
};

export const adminTeamParticipationService = {
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
