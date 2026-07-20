import type { PaginatedResponse, QueryParams } from "@/shared/api";
import { api } from "@/shared/api";
import type { PersonMinimal, StatusRef } from "@/shared/types";

export type PlayerStatus = StatusRef;

export interface PlayerListItem {
  id: number;
  person: PersonMinimal;
  position: string;
  preferred_jersey_number: number | null;
  status: StatusRef;
  is_active: boolean;
}

export interface PlayerDetail extends PlayerListItem {
  height_cm: number | null;
  weight_kg: number | null;
  dominant_foot: string;
  nationality: string;
  photo: string | null;
  biography: string;
  social_links: unknown;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type PlayerInput = {
  person: number;
  status?: number;
  position?: string;
  preferred_jersey_number?: number | null;
  is_active?: boolean;
  notes?: string;
};

export interface TeamParticipationPlayerListItem {
  id: number;
  team_participation: number;
  player: PlayerListItem;
  jersey_number: number | null;
  position: string;
  is_captain: boolean;
  is_vice_captain: boolean;
  status: StatusRef | null;
  is_active: boolean;
  goals: number;
  assists: number;
}

export type TeamParticipationPlayerInput = {
  team_participation: number;
  player: number;
  jersey_number?: number | null;
  is_captain?: boolean;
  is_vice_captain?: boolean;
  position?: string;
  status?: number;
  is_active?: boolean;
  notes?: string;
};

export const playerService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<PlayerListItem>>("/players/", { params });
  },

  get(id: number) {
    return api.get<PlayerDetail>(`/players/${id}/`);
  },

  create(data: PlayerInput) {
    return api.post<PlayerDetail>("/players/", data);
  },

  listStatuses() {
    return api.get<PlayerStatus[]>("/player-statuses/");
  },
};

export const participationPlayerService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<TeamParticipationPlayerListItem>>(
      "/team-participation-players/",
      { params },
    );
  },

  create(data: TeamParticipationPlayerInput) {
    return api.post<TeamParticipationPlayerListItem>(
      "/team-participation-players/",
      data,
    );
  },

  update(id: number, data: Partial<TeamParticipationPlayerInput>) {
    return api.patch<TeamParticipationPlayerListItem>(
      `/team-participation-players/${id}/`,
      data,
    );
  },

  delete(id: number) {
    return api.delete<void>(`/team-participation-players/${id}/`);
  },
};
