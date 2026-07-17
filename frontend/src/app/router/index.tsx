import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/app/layout/AppLayout";
import { AppProviders } from "@/app/providers/AppProviders";
import { HomeRedirect } from "@/app/router/HomeRedirect";
import { RequireAuth } from "@/app/router/RequireAuth";
import { RequirePermission } from "@/app/router/RequirePermission";
import { LoginPage } from "@/modules/auth/pages/LoginPage";
import { UnauthorizedPage } from "@/modules/auth/pages/UnauthorizedPage";
import { DashboardPage } from "@/modules/dashboard/pages/DashboardPage";
import { EditionDetailPage } from "@/modules/editions/pages/EditionDetailPage";
import { EditionEditPage } from "@/modules/editions/pages/EditionEditPage";
import { EditionMatchesPage } from "@/modules/editions/pages/EditionMatchesPage";
import { EditionPhasesPage } from "@/modules/editions/pages/EditionPhasesPage";
import { EditionPlayersPage } from "@/modules/editions/pages/EditionPlayersPage";
import { EditionTeamsPage } from "@/modules/editions/pages/EditionTeamsPage";
import { LiveMatchPage } from "@/modules/live/pages/LiveMatchPage";
import { MatchDetailPage } from "@/modules/matches/pages/MatchDetailPage";
import { PlayerCreatePage } from "@/modules/players/pages/PlayerCreatePage";
import { PlayerDetailPage } from "@/modules/players/pages/PlayerDetailPage";
import { PlayerListPage } from "@/modules/players/pages/PlayerListPage";
import { TeamCreatePage } from "@/modules/teams/pages/TeamCreatePage";
import { TeamDetailPage } from "@/modules/teams/pages/TeamDetailPage";
import { TeamListPage } from "@/modules/teams/pages/TeamListPage";
import { TournamentDetailPage } from "@/modules/tournaments/pages/TournamentDetailPage";
import { TournamentFormPage } from "@/modules/tournaments/pages/TournamentFormPage";
import { TournamentListPage } from "@/modules/tournaments/pages/TournamentListPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppProviders>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/" element={<HomeRedirect />} />

            <Route path="/tournaments" element={<TournamentListPage />} />
            <Route path="/tournaments/:id" element={<TournamentDetailPage />} />

            <Route element={<RequireAuth />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route
                element={<RequirePermission code="tournament.create" />}
              >
                <Route
                  path="/tournaments/new"
                  element={<TournamentFormPage mode="create" />}
                />
              </Route>
              <Route
                path="/tournaments/:id/edit"
                element={<TournamentFormPage mode="edit" />}
              />
              <Route path="/editions/:id/edit" element={<EditionEditPage />} />
              <Route path="/teams/new" element={<TeamCreatePage />} />
              <Route path="/players/new" element={<PlayerCreatePage />} />
            </Route>

            <Route path="/editions/:id" element={<EditionDetailPage />} />
            <Route path="/editions/:id/teams" element={<EditionTeamsPage />} />
            <Route
              path="/editions/:id/players"
              element={<EditionPlayersPage />}
            />
            <Route
              path="/editions/:id/phases"
              element={<EditionPhasesPage />}
            />
            <Route
              path="/editions/:id/matches"
              element={<EditionMatchesPage />}
            />

            <Route path="/teams" element={<TeamListPage />} />
            <Route path="/teams/:id" element={<TeamDetailPage />} />

            <Route path="/players" element={<PlayerListPage />} />
            <Route path="/players/:id" element={<PlayerDetailPage />} />

            <Route path="/matches/:id" element={<MatchDetailPage />} />
            <Route path="/live/matches/:id" element={<LiveMatchPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}
