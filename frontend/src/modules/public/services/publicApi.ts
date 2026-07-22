import type { PaginatedResponse, QueryParams } from "@/shared/api";
import { api } from "@/shared/api";
import type { EditionDetail, EditionListItem } from "@/modules/editions/services/editionService";
import type {
  MatchDetail,
  MatchEventListItem,
  MatchListItem,
  PhaseListItem,
} from "@/modules/matches/services/matchService";
import type {
  TeamListItem,
  TeamParticipationListItem,
} from "@/modules/teams/services/teamService";
import type { TeamParticipationPlayerListItem } from "@/modules/players/services/playerService";

/** Guest-safe API reads (no JWT) — always public edition scoped on the backend. */
const guest = { auth: false as const };

export type PublicPerson = {
  id: number;
  first_name: string;
  last_name: string;
  nickname: string;
  date_of_birth?: string | null;
  nationality_name?: string | null;
  photo?: string | null;
  city?: string;
  country?: string;
  bio?: string;
  show_as_anonymous?: boolean;
};

export type FinalStandingRow = {
  id: number;
  tournament_edition: number;
  team_participation: number;
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

export type PlayerAwardRow = {
  id: number;
  player: number;
  player_name?: string;
  award: { id: number; name: string; code: string; description?: string };
  tournament_edition: number;
  team_participation?: number | null;
  team_name?: string | null;
  notes?: string;
};

export const publicApi = {
  listEditions(params?: QueryParams) {
    return api.get<PaginatedResponse<EditionListItem>>("/editions/", {
      params: { page_size: 100, ...params },
      ...guest,
    });
  },

  getEdition(id: number) {
    return api.get<EditionDetail>(`/editions/${id}/`, guest);
  },

  listMatches(params?: QueryParams) {
    return api.get<PaginatedResponse<MatchListItem>>("/matches/", {
      params: { page_size: 100, ...params },
      ...guest,
    });
  },

  getMatch(id: number) {
    return api.get<MatchDetail>(`/matches/${id}/`, guest);
  },

  listEvents(params?: QueryParams) {
    return api.get<PaginatedResponse<MatchEventListItem>>("/match-events/", {
      params: { page_size: 200, ...params },
      ...guest,
    });
  },

  listPhases(editionId: number) {
    return api.get<PaginatedResponse<PhaseListItem>>("/phases/", {
      params: { tournament_edition: editionId, page_size: 50 },
      ...guest,
    });
  },

  listTeams(params?: QueryParams) {
    return api.get<PaginatedResponse<TeamListItem>>("/teams/", {
      params: { page_size: 100, ...params },
      ...guest,
    });
  },

  listParticipations(editionId: number) {
    return api.get<PaginatedResponse<TeamParticipationListItem>>(
      "/team-participations/",
      {
        params: { tournament_edition: editionId, page_size: 100 },
        ...guest,
      },
    );
  },

  listEditionPlayers(editionId: number) {
    return api.get<PaginatedResponse<TeamParticipationPlayerListItem>>(
      "/team-participation-players/",
      {
        params: { tournament_edition: editionId, page_size: 200 },
        ...guest,
      },
    );
  },

  listPersons(params?: QueryParams) {
    return api.get<PaginatedResponse<PublicPerson>>("/persons/", {
      params: { page_size: 100, ...params },
      ...guest,
    });
  },

  listStandings(editionId: number) {
    return api.get<PaginatedResponse<FinalStandingRow> | FinalStandingRow[]>(
      "/final-standings/",
      {
        params: { tournament_edition: editionId, page_size: 100 },
        ...guest,
      },
    );
  },

  listAwards(editionId: number) {
    return api.get<PaginatedResponse<PlayerAwardRow> | PlayerAwardRow[]>(
      "/player-awards/",
      {
        params: { tournament_edition: editionId, page_size: 100 },
        ...guest,
      },
    );
  },
};

export function normalizeList<T>(data: PaginatedResponse<T> | T[] | null | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}

export type EditionBucket = "active" | "upcoming" | "finished" | "other";

export function editionBucket(statusCode: string | null | undefined): EditionBucket {
  const code = (statusCode ?? "").toLowerCase();
  if (code === "ongoing") return "active";
  if (code === "finished") return "finished";
  if (code === "draft" || code === "registration") return "upcoming";
  return "other";
}
