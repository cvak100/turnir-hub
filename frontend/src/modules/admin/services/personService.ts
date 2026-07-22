import { api } from "@/shared/api";
import type { PaginatedResponse, QueryParams } from "@/shared/api/types";

export type PersonStatus = {
  id: number;
  name: string;
  code: string;
  color: string;
};

export type Country = {
  id: number;
  name: string;
  code: string;
  iso2: string;
  order?: number;
  is_active?: boolean;
};

export type PlayerStatus = {
  id: number;
  name: string;
  code: string;
  color: string;
};

export type PersonRoleType = {
  id: number;
  name: string;
  code: string;
  description?: string;
  order?: number;
  is_active?: boolean;
};

export type PersonRoleBrief = {
  id: number;
  name: string;
  code: string;
};

export type PlayerAttrs = {
  id?: number;
  position: string;
  secondary_position: string;
  jersey_number: number | null;
  preferred_foot: string;
  height: number | null;
  weight: number | null;
  current_club: string;
  player_status: PlayerStatus | null;
  contract_until: string | null;
  is_active?: boolean;
};

export type LinkedUser = {
  id: number;
  username: string;
};

export type PersonListItem = {
  id: number;
  first_name: string;
  last_name: string;
  nickname: string;
  email: string;
  status: PersonStatus | null;
  user: LinkedUser | null;
  show_as_anonymous: boolean;
  roles: PersonRoleBrief[];
  is_player: boolean;
  is_coach: boolean;
  is_referee: boolean;
  is_staff: boolean;
  is_official: boolean;
};

export type PersonDetail = PersonListItem & {
  date_of_birth: string | null;
  place_of_birth: string;
  nationality: Country | null;
  gender: string;
  photo: string | null;
  bio: string;
  phone: string;
  city: string;
  country: string;
  notes: string;
  player: PlayerAttrs | null;
  created_at: string;
  updated_at: string;
};

export type PlayerAttrsInput = {
  position?: string;
  secondary_position?: string;
  jersey_number?: number | null;
  preferred_foot?: string;
  height?: number | null;
  weight?: number | null;
  current_club?: string;
  player_status?: number | null;
  contract_until?: string | null;
};

export type PersonInput = {
  first_name: string;
  last_name: string;
  nickname?: string;
  date_of_birth?: string | null;
  place_of_birth?: string;
  nationality?: number | null;
  gender?: string;
  bio?: string;
  status?: number;
  user?: number | null;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  show_as_anonymous?: boolean;
  notes?: string;
  is_player?: boolean;
  is_coach?: boolean;
  is_referee?: boolean;
  is_staff?: boolean;
  is_official?: boolean;
  player?: PlayerAttrsInput | null;
};

export const personService = {
  list(params?: QueryParams) {
    return api.get<PaginatedResponse<PersonListItem>>("/persons/", { params });
  },

  get(id: number) {
    return api.get<PersonDetail>(`/persons/${id}/`);
  },

  create(data: PersonInput) {
    return api.post<PersonDetail>("/persons/", data);
  },

  update(id: number, data: PersonInput) {
    return api.patch<PersonDetail>(`/persons/${id}/`, data);
  },

  delete(id: number) {
    return api.delete<void>(`/persons/${id}/`);
  },

  listRoleTypes() {
    return api.get<PersonRoleType[]>("/person-role-types/");
  },

  listStatuses() {
    return api.get<PersonStatus[]>("/person-statuses/");
  },

  listCountries() {
    return api.get<Country[]>("/countries/");
  },

  listPlayerStatuses() {
    return api.get<PlayerStatus[]>("/player-statuses/");
  },
};
