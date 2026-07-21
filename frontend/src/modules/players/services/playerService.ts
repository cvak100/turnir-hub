import type { PaginatedResponse, QueryParams } from "@/shared/api";
import { api } from "@/shared/api";
import type { PersonMinimal, StatusRef } from "@/shared/types";

export type PlayerStatus = StatusRef;

export type PersonPublic = PersonMinimal & {
  date_of_birth?: string | null;
  place_of_birth?: string;
  nationality_name?: string | null;
  gender?: string;
  photo?: string | null;
  bio?: string;
  city?: string;
  country?: string;
  show_as_anonymous?: boolean;
};

export interface PlayerListItem {
  id: number;
  person: PersonMinimal;
  position: string;
  preferred_jersey_number: number | null;
  status: StatusRef;
  is_active: boolean;
}

export interface PlayerDetail extends Omit<PlayerListItem, "person"> {
  person: PersonPublic;
  secondary_position: string;
  height_cm: number | null;
  weight_kg: number | null;
  dominant_foot: string;
  current_club: string;
  contract_until: string | null;
  nationality: string;
  photo: string | null;
  biography: string;
  social_links: unknown;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type PlayerInput = {
  person?: number;
  status?: number;
  position?: string;
  secondary_position?: string;
  preferred_jersey_number?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  dominant_foot?: string;
  current_club?: string;
  contract_until?: string | null;
  nationality?: string;
  biography?: string;
  social_links?: unknown;
  is_active?: boolean;
  notes?: string;
};

export interface TeamParticipationPlayerListItem {
  id: number;
  team_participation: number;
  team_name?: string | null;
  participation_name?: string | null;
  tournament_edition_id?: number;
  tournament_edition_name?: string | null;
  tournament_edition_year?: number | null;
  player: PlayerListItem;
  jersey_number: number | null;
  position: string;
  is_captain: boolean;
  is_vice_captain: boolean;
  status: StatusRef | null;
  is_active: boolean;
  goals: number;
  assists: number;
  yellow_cards?: number;
  red_cards?: number;
  matches_played?: number;
  minutes_played?: number;
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

  update(id: number, data: Partial<PlayerInput>) {
    return api.patch<PlayerDetail>(`/players/${id}/`, data);
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
